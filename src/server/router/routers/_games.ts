import { gameSchema } from "$src/pages/characters/[characterId]/game/new";
import { DungeonMaster, Game } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createProtectedRouter } from "../protected-router";

// Example router with queries that can only be hit if the user requesting is signed in
export const protectedGamesRouter = createProtectedRouter()
  .mutation("save", {
    input: gameSchema,
    async resolve({ input, ctx }) {
      let dm: DungeonMaster;
      if (!input.dm.id) {
        const search = await ctx.prisma.dungeonMaster.findFirst({
          where: {
            OR: [{ name: input.dm.name }, { DCI: input.dm.DCI }]
          }
        });
        if (search) dm = search;
        else
          dm = await ctx.prisma.dungeonMaster.create({
            data: {
              name: input.dm.name,
              DCI: input.dm.DCI
            }
          });
      } else {
        const search = await ctx.prisma.dungeonMaster.findFirst({
          where: {
            id: input.dm.id
          }
        });
        if (search) {
          dm = await ctx.prisma.dungeonMaster.update({
            where: {
              id: input.dm.id
            },
            data: {
              name: input.dm.name,
              DCI: input.dm.DCI
            }
          });
        } else throw new TRPCError({ message: "Dungeon Master not found", code: "INTERNAL_SERVER_ERROR" });
      }

      if (!dm.id) throw new TRPCError({ message: "Could not save Dungeon Master", code: "INTERNAL_SERVER_ERROR" });

      const data: Omit<Game, "id" | "created_at"> = {
        name: input.name,
        date: new Date(input.date),
        description: input.description,
        dungeonMasterId: dm.id,
        characterId: input.characterId,
        acp: input.acp,
        tcp: input.tcp,
        experience: input.experience,
        level: input.level,
        gold: input.gold
      };
      const game: Game = await ctx.prisma.game.upsert({
        where: {
          id: input.gameId
        },
        update: data,
        create: data
      });

      if (!game.id) throw new TRPCError({ message: "Could not save game", code: "INTERNAL_SERVER_ERROR" });

      const itemsToUpdate = input.magic_items_gained.filter(item => item.id);

      await ctx.prisma.magicItem.deleteMany({
        where: {
          gameGainedId: game.id,
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
            gameGainedId: game.id
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
          id: {
            in: input.magic_items_lost
          }
        },
        data: {
          gameLostId: game.id
        }
      });

      const storyAwardsToUpdate = input.story_awards_gained.filter(item => item.id);

      await ctx.prisma.storyAward.deleteMany({
        where: {
          gameGainedId: game.id,
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
            gameGainedId: game.id
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
          id: {
            in: input.story_awards_lost
          }
        },
        data: {
          gameLostId: game.id
        }
      });

      return ctx.prisma.game.findFirst({
        where: {
          id: game.id
        }
      });
    }
  })
  .mutation("delete", {
    input: z.object({
      gameId: z.string()
    }),
    async resolve({ input, ctx }) {
      await ctx.prisma.magicItem.updateMany({
        where: {
          gameLostId: input.gameId
        },
        data: {
          gameLostId: null
        }
      });
      await ctx.prisma.magicItem.deleteMany({
        where: {
          gameGainedId: input.gameId
        }
      });
      await ctx.prisma.storyAward.updateMany({
        where: {
          gameLostId: input.gameId
        },
        data: {
          gameLostId: null
        }
      });
      await ctx.prisma.storyAward.deleteMany({
        where: {
          gameGainedId: input.gameId
        }
      });
      return ctx.prisma.game.delete({
        where: {
          id: input.gameId
        }
      });
    }
  });
