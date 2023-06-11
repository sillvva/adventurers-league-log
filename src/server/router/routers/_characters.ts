import { editCharacterSchema, newCharacterSchema } from "$src/types/zod-schema";
import { z } from "zod";

import { createProtectedRouter } from "../protected-router";

export const protectedCharactersRouter = createProtectedRouter()
	.mutation("create", {
		input: newCharacterSchema,
		async resolve({ input, ctx }) {
			return await ctx.prisma.character.create({
				data: {
					...input,
					userId: ctx.session.user.id
				}
			});
		}
	})
	.mutation("edit", {
		input: editCharacterSchema,
		async resolve({ input, ctx }) {
			return await ctx.prisma.character.update({
				where: { id: input.id },
				data: {
					...input
				}
			});
		}
	})
	.mutation("delete", {
		input: z.object({
			id: z.string()
		}),
		async resolve({ input, ctx }) {
			const character = await ctx.prisma.character.findUnique({
				where: { id: input.id },
				include: { logs: { include: { character: true } } }
			});
			if (character && character.userId !== ctx.session.user.id) {
				const logIds = character.logs.map(log => log.id);
				return await ctx.prisma.$transaction(async tx => {
					await tx.magicItem.deleteMany({
						where: {
							logGainedId: {
								in: logIds
							}
						}
					});
					await tx.storyAward.deleteMany({
						where: {
							logGainedId: {
								in: logIds
							}
						}
					});
					await tx.log.deleteMany({
						where: {
							id: {
								in: logIds
							}
						}
					});
					return await tx.character.delete({
						where: { id: input.id }
					});
				});
			} else return false;
		}
	})
	.query("getDMs", {
		async resolve({ ctx }) {
			return await ctx.prisma.dungeonMaster.findMany({
				where: {
					OR: [
						{
							logs: {
								every: {
									character: {
										userId: ctx.session.user.id
									}
								}
							}
						},
						{
							uid: ctx.session.user.id
						}
					]
				}
			});
		}
	});
