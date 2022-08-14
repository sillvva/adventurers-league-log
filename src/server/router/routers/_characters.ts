import { newCharacterSchema } from "$src/pages/characters/new";
import { editCharacterSchema } from "$src/pages/characters/[characterId]/edit";
import { z } from "zod";
import { createProtectedRouter } from "../protected-router";

// Example router with queries that can only be hit if the user requesting is signed in
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
          logs: {
            every: {
              character: {
                userId: ctx.session.user.id
              }
            }
          }
        }
      });
    }
  });
