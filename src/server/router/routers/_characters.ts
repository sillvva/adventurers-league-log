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
			return await ctx.prisma.character.delete({
				where: { id: input.id }
			});
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
