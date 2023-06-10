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
				await ctx.prisma.magicItem.deleteMany({
					where: {
						logGainedId: {
							in: logIds
						}
					}
				});
				await ctx.prisma.storyAward.deleteMany({
					where: {
						logGainedId: {
							in: logIds
						}
					}
				});
				return await ctx.prisma.character.delete({
					where: { id: input.id }
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
