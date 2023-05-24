import { logSchema } from "$src/types/zod-schema";
import { getLevels } from "$src/utils/logs";
import { parseError } from "$src/utils/misc";
import type { DungeonMaster, Log } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createProtectedRouter } from "../protected-router";

// Example router with queries that can only be hit if the user requesting is signed in
export const protectedLogsRouter = createProtectedRouter()
	.mutation("save", {
		input: logSchema,
		async resolve({ input, ctx }) {
			let dm: DungeonMaster | null = null;
			const user = ctx.session.user;
			const isMe = input.dm.name.trim() === user.name?.trim();
			if (input.dm.name.trim()) {
				if (!input.dm.id) {
					const search = await ctx.prisma.dungeonMaster.findFirst({
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
						dm = await ctx.prisma.dungeonMaster.create({
							data: {
								name: input.dm.name.trim(),
								DCI: input.dm.DCI,
								uid: input.is_dm_log || isMe ? user.id : null
							}
						});
				} else {
					try {
						dm = await ctx.prisma.dungeonMaster.update({
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
						throw new TRPCError({ message: parseError(err), code: "INTERNAL_SERVER_ERROR" });
					}
				}
			}

			if (input.type == "game" && !dm?.id) throw new TRPCError({ message: "Could not save Dungeon Master", code: "INTERNAL_SERVER_ERROR" });

			let applied_date: Date | null = input.is_dm_log
				? input.characterId && input.applied_date !== null
					? new Date(input.applied_date)
					: null
				: new Date(input.date);
			if (input.characterId && applied_date === null) throw new TRPCError({ message: "Applied date is required", code: "BAD_REQUEST" });

			if (input.characterId) {
				const character = await ctx.prisma.character.findFirst({
					include: {
						logs: true
					},
					where: { id: input.characterId }
				});

				if (!character) throw new TRPCError({ message: "Character not found", code: "INTERNAL_SERVER_ERROR" });

				const currentLevel = getLevels(character.logs).total;
				if (!input.logId && currentLevel == 20 && (input.level > 0 || input.acp > 0 || input.experience > 0))
					throw new TRPCError({ message: "Character is already level 20", code: "BAD_REQUEST" });

				const newLevel = getLevels(character.logs, {
					experience: input.experience,
					acp: input.acp,
					level: input.level
				}).total;
				if (newLevel > 20) throw new TRPCError({ message: "Character cannot be above level 20", code: "BAD_REQUEST" });
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
			const log: Log = await ctx.prisma.log.upsert({
				where: {
					id: input.logId
				},
				update: data,
				create: data
			});

			if (!log.id) throw new TRPCError({ message: "Could not save log", code: "INTERNAL_SERVER_ERROR" });

			const itemsToUpdate = input.magic_items_gained.filter(item => item.id);

			await ctx.prisma.magicItem.deleteMany({
				where: {
					logGainedId: log.id,
					id: {
						notIn: itemsToUpdate.map(item => item.id)
					}
				}
			});

			await ctx.prisma.magicItem.createMany({
				data: input.magic_items_gained
					.filter(item => !item.id)
					.map(item => ({
						name: item.name,
						description: item.description,
						logGainedId: log.id
					}))
			});

			for (let item of itemsToUpdate) {
				await ctx.prisma.magicItem.update({
					where: {
						id: item.id
					},
					data: {
						name: item.name,
						description: item.description
					}
				});
			}

			await ctx.prisma.magicItem.updateMany({
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

			await ctx.prisma.magicItem.updateMany({
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

			await ctx.prisma.storyAward.deleteMany({
				where: {
					logGainedId: log.id,
					id: {
						notIn: storyAwardsToUpdate.map(item => item.id)
					}
				}
			});

			await ctx.prisma.storyAward.createMany({
				data: input.story_awards_gained
					.filter(item => !item.id)
					.map(item => ({
						name: item.name,
						description: item.description,
						logGainedId: log.id
					}))
			});

			for (let item of storyAwardsToUpdate) {
				await ctx.prisma.storyAward.update({
					where: {
						id: item.id
					},
					data: {
						name: item.name,
						description: item.description
					}
				});
			}
			await ctx.prisma.storyAward.updateMany({
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

			await ctx.prisma.storyAward.updateMany({
				where: {
					id: {
						in: input.story_awards_lost
					}
				},
				data: {
					logLostId: log.id
				}
			});

			const updated = await ctx.prisma.log.findFirst({
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

			return (
				updated && {
					...updated,
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
			await ctx.prisma.magicItem.updateMany({
				where: {
					logLostId: input.logId
				},
				data: {
					logLostId: null
				}
			});
			await ctx.prisma.magicItem.deleteMany({
				where: {
					logGainedId: input.logId
				}
			});
			await ctx.prisma.storyAward.updateMany({
				where: {
					logLostId: input.logId
				},
				data: {
					logLostId: null
				}
			});
			await ctx.prisma.storyAward.deleteMany({
				where: {
					logGainedId: input.logId
				}
			});
			return ctx.prisma.log.delete({
				where: {
					id: input.logId
				}
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
