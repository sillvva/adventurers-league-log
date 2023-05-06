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
			const dm = await ctx.prisma.dungeonMaster.findUnique({
				where: {
					id: input.id
				},
				include: {
					_count: {
						select: {
							logs: true
						}
					}
				}
			});
			if (dm?.uid !== ctx.session.user.id) throw new Error("You do not have permission to delete this DM");
			if (dm._count.logs > 0) throw new Error("You cannot delete a DM that has logs");
			return await ctx.prisma.dungeonMaster.delete({
				where: { id: input.id }
			});
		}
	})
	.query("getOne", {
		input: z.object({
			id: z.string()
		}),
		async resolve({ input, ctx }) {
			const dms = await ctx.prisma.dungeonMaster.findMany({
				include: {
					logs: {
						include: {
							character: {
								include: {
									user: true
								}
							}
						}
					}
				},
				where: {
					id: input.id,
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
			if (dms.length === 0) throw new Error("You do not have permission to view this DM");
			return await ctx.prisma.dungeonMaster.findUnique({
				where: {
					id: input.id
				}
			});
		}
	})
	.query("getMany", {
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
