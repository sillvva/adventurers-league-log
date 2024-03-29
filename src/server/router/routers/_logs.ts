import { logSchema } from "$src/types/zod-schema";
import { getLevels } from "$src/utils/logs";
import { parseError } from "$src/utils/misc";
import { z } from "zod";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../protected-router";

import type { DungeonMaster, Log } from "@prisma/client";

export const protectedLogsRouter = createProtectedRouter()
	.mutation("save", {
		input: logSchema,
		async resolve({ input, ctx }) {
			const log = await ctx.prisma.$transaction(async tx => {
				let dm: DungeonMaster | null = null;
				const user = ctx.session.user;
				const isMe = input.dm.name.trim() === user.name?.trim();
				if (input.dm.name.trim()) {
					if (!input.dm.id) {
						const search = await tx.dungeonMaster.findFirst({
							where: {
								OR:
									input.is_dm_log || isMe
										? [{ uid: user.id }]
										: input.dm.DCI === null
										? [{ name: input.dm.name.trim() }]
										: [{ name: input.dm.name.trim() }, { DCI: input.dm.DCI }]
							}
						});
						if (search) dm = search;
						else
							dm = await tx.dungeonMaster.create({
								data: {
									name: input.dm.name.trim(),
									DCI: input.dm.DCI,
									uid: input.is_dm_log || isMe ? user.id : null
								}
							});
					} else {
						try {
							dm = await tx.dungeonMaster.update({
								where: {
									id: input.dm.id
								},
								data: {
									name: input.dm.name.trim(),
									DCI: input.dm.DCI,
									uid: input.is_dm_log || isMe ? user.id : null
								}
							});
						} catch (err) {
							throw new Error(parseError(err));
						}
					}
				}

				if (input.type == "game" && !dm?.id) throw new Error("Could not save Dungeon Master");

				let applied_date: Date | null = input.is_dm_log
					? input.characterId && input.applied_date !== null
						? new Date(input.applied_date)
						: null
					: new Date(input.date);
				if (input.characterId && applied_date === null) throw new Error("Applied date is required");

				if (input.characterId) {
					const character = await tx.character.findFirst({
						include: {
							logs: true
						},
						where: { id: input.characterId }
					});

					if (!character) throw new Error("Character not found");

					const currentLevel = getLevels(character.logs).total;
					const logACP = character.logs.find(log => log.id === input.logId)?.acp || 0;
					if (currentLevel == 20 && input.acp - logACP > 0) throw new Error("Character is already level 20");
					const logLevel = character.logs.find(log => log.id === input.logId)?.level || 0;
					if (currentLevel + input.level - logLevel > 20) throw new Error("Character cannot level past 20");
				}

				const data: Omit<Log, "id" | "created_at"> = {
					name: input.name,
					date: new Date(input.date),
					description: input.description,
					type: input.type,
					dungeonMasterId: (dm || {}).id || null,
					is_dm_log: input.is_dm_log,
					applied_date: applied_date,
					characterId: input.characterId,
					acp: input.acp,
					tcp: input.tcp,
					experience: input.experience,
					level: input.level,
					gold: input.gold,
					dtd: input.dtd
				};

				const log: Log = await tx.log.upsert({
					where: {
						id: input.logId
					},
					update: data,
					create: data
				});

				if (!log.id) throw new Error("Could not save log");

				const itemsToUpdate = input.magic_items_gained.filter(item => item.id);

				await tx.magicItem.deleteMany({
					where: {
						logGainedId: log.id,
						id: {
							notIn: itemsToUpdate.map(item => item.id)
						}
					}
				});

				await tx.magicItem.createMany({
					data: input.magic_items_gained
						.filter(item => !item.id)
						.map(item => ({
							name: item.name,
							description: item.description,
							logGainedId: log.id
						}))
				});

				for (let item of itemsToUpdate) {
					await tx.magicItem.update({
						where: {
							id: item.id
						},
						data: {
							name: item.name,
							description: item.description
						}
					});
				}

				await tx.magicItem.updateMany({
					where: {
						logLostId: log.id,
						id: {
							notIn: input.magic_items_lost
						}
					},
					data: {
						logLostId: null
					}
				});

				await tx.magicItem.updateMany({
					where: {
						id: {
							in: input.magic_items_lost
						}
					},
					data: {
						logLostId: log.id
					}
				});

				const storyAwardsToUpdate = input.story_awards_gained.filter(item => item.id);

				await tx.storyAward.deleteMany({
					where: {
						logGainedId: log.id,
						id: {
							notIn: storyAwardsToUpdate.map(item => item.id)
						}
					}
				});

				await tx.storyAward.createMany({
					data: input.story_awards_gained
						.filter(item => !item.id)
						.map(item => ({
							name: item.name,
							description: item.description,
							logGainedId: log.id
						}))
				});

				for (let item of storyAwardsToUpdate) {
					await tx.storyAward.update({
						where: {
							id: item.id
						},
						data: {
							name: item.name,
							description: item.description
						}
					});
				}
				await tx.storyAward.updateMany({
					where: {
						logLostId: log.id,
						id: {
							notIn: input.story_awards_lost
						}
					},
					data: {
						logLostId: null
					}
				});

				await tx.storyAward.updateMany({
					where: {
						id: {
							in: input.story_awards_lost
						}
					},
					data: {
						logLostId: log.id
					}
				});

				const updated = await tx.log.findFirst({
					where: {
						id: log.id
					},
					include: {
						dm: true,
						magic_items_gained: true,
						magic_items_lost: true,
						story_awards_gained: true,
						story_awards_lost: true
					}
				});

				return updated;
			});

			return (
				log && {
					...log,
					saving: true
				}
			);
		}
	})
	.mutation("delete", {
		input: z.object({
			logId: z.string()
		}),
		async resolve({ input, ctx }) {
			return await ctx.prisma.$transaction(async tx => {
				await tx.magicItem.updateMany({
					where: {
						logLostId: input.logId
					},
					data: {
						logLostId: null
					}
				});
				await tx.magicItem.deleteMany({
					where: {
						logGainedId: input.logId
					}
				});
				await tx.storyAward.updateMany({
					where: {
						logLostId: input.logId
					},
					data: {
						logLostId: null
					}
				});
				await tx.storyAward.deleteMany({
					where: {
						logGainedId: input.logId
					}
				});
				return await tx.log.delete({
					where: {
						id: input.logId
					}
				});
			});
		}
	})
	.query("dm-logs", {
		async resolve({ ctx }) {
			return ctx.prisma.log.findMany({
				where: {
					is_dm_log: true,
					dm: {
						OR: [
							{
								uid: ctx.session.user.id
							},
							{
								name: ctx.session.user.name || ""
							}
						]
					}
				},
				include: {
					dm: true,
					magic_items_gained: true,
					magic_items_lost: true,
					story_awards_gained: true,
					story_awards_lost: true,
					character: {
						include: {
							user: true
						}
					}
				}
			});
		}
	});
