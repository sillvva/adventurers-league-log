import { dungeonMasterSchema } from "$src/types/zod-schema";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { createProtectedRouter } from "../protected-router";

// Example router with queries that can only be hit if the user requesting is signed in
export const protectedDMsRouter = createProtectedRouter()
	.mutation("edit", {
		input: dungeonMasterSchema,
		async resolve({ input, ctx }) {
			const dms = await getDMs(ctx.prisma, ctx.session.user.id, input.id);
			if (!dms.length) throw new Error("You do not have permission to edit this DM");
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
			const dms = await getDMs(ctx.prisma, ctx.session.user.id, input.id);
			if (!dms.length) throw new Error("You do not have permission to delete this DM");
			const dm = dms.find(dm => dm.logs.find(log => log?.character?.userId === ctx.session.user.id));
			if (dm?.logs?.length) throw new Error("You cannot delete a DM that has logs");
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
			const dms = await getDMs(ctx.prisma, ctx.session.user.id, input.id);
			if (!dms.length) throw new Error("You do not have permission to view this DM");
			return dms[0];
		}
	})
	.query("getMany", {
		async resolve({ ctx }) {
			return await getDMs(ctx.prisma, ctx.session.user.id);
		}
	});

const getDMs = async (prisma: PrismaClient, userId: string, dmId: string | null = null) => {
	return await prisma.dungeonMaster.findMany({
		include: {
			logs: {
				include: {
					character: true
				}
			}
		},
		where: {
			...(dmId ? { id: dmId } : {}),
			OR: [
				{
					logs: {
						every: {
							character: {
								userId: userId
							}
						}
					}
				},
				{
					uid: userId
				}
			]
		}
	});
};
