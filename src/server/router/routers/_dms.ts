import { dungeonMasterSchema } from "$src/types/zod-schema";
import { z } from "zod";
import { createProtectedRouter } from "../protected-router";

// Example router with queries that can only be hit if the user requesting is signed in
export const protectedDMsRouter = createProtectedRouter()
	.mutation("edit", {
		input: dungeonMasterSchema,
		async resolve({ input, ctx }) {
			return await ctx.prisma.dungeonMaster.update({
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
			return await ctx.prisma.dungeonMaster.delete({
				where: { id: input.id }
			});
		}
	})
	.query("getDMs", {
		async resolve({ ctx }) {
			return await ctx.prisma.dungeonMaster.findMany({
				include: {
					_count: {
						select: {
							logs: true
						}
					}
				},
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
