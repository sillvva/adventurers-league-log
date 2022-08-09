import { newCharacterSchema } from "$src/pages/characters/new";
import { createProtectedRouter } from "../protected-router";

// Example router with queries that can only be hit if the user requesting is signed in
export const protectedCharactersRouter = createProtectedRouter()
  .query("getSession", {
    resolve({ ctx }) {
      return ctx.session;
    }
  })
  .mutation("new", {
    input: newCharacterSchema,
    async resolve({ input, ctx }) {
      return await ctx.prisma.character.create({
        data: {
          ...input,
          userId: ctx.session.user.id
        }
      });
    }
  });
