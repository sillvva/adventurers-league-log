import { newGameSchema } from "$src/pages/characters/[characterId]/game/new";
import { editCharacterSchema } from "$src/pages/characters/[characterId]/edit";
import { createProtectedRouter } from "../protected-router";

// Example router with queries that can only be hit if the user requesting is signed in
export const protectedGamesRouter = createProtectedRouter()
  .mutation("new", {
    input: newGameSchema,
    async resolve({ input, ctx }) {
      console.log(input);
      // return await ctx.prisma.game.create({
      //   data: {
      //     ...input,
      //     created_at: new Date(),
      //   }
      // });
    }
  })
  .mutation("edit", {
    input: newGameSchema,
    async resolve({ input, ctx }) {
      // return await ctx.prisma.character.update({
      //   where: { id: input.id },
      //   data: {
      //     ...input
      //   }
      // });
    }
  });
