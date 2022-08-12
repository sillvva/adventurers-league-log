import { logSchema } from "$src/pages/characters/[characterId]/log/[logId]";
import { parseError } from "$src/utils/misc";
import { DungeonMaster, Log } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createProtectedRouter } from "../protected-router";

// Example router with queries that can only be hit if the user requesting is signed in
export const protectedLogsRouter = createProtectedRouter()
  .mutation("save", {
    input: logSchema,
    async resolve({ input, ctx }) {
      let dm: DungeonMaster | null = null;
      if (input.dm.name.trim()) {
        if (!input.dm.id) {
          const search = await ctx.prisma.dungeonMaster.findFirst({
            where: {
              OR: input.isDMLog ? [{ uid: ctx.session.user.id }] : [{ name: input.dm.name }, { DCI: input.dm.DCI }]
            }
          });
          if (search) dm = search;
          else
            dm = await ctx.prisma.dungeonMaster.create({
              data: {
                name: input.dm.name,
                DCI: input.dm.DCI,
                uid: input.isDMLog ? ctx.session.user.id : null
              }
            });
        } else {
          try {
            dm = await ctx.prisma.dungeonMaster.update({
              where: {
                id: input.dm.id
              },
              data: {
                name: input.dm.name,
                DCI: input.dm.DCI,
                uid: input.isDMLog ? ctx.session.user.id : null
              }
            });
          } catch (err) {
            throw new TRPCError({ message: parseError(err), code: "INTERNAL_SERVER_ERROR" });
          }
        }

        if (!dm.id) throw new TRPCError({ message: "Could not save Dungeon Master", code: "INTERNAL_SERVER_ERROR" });
      }

      const data: Omit<Log, "id" | "created_at"> = {
        name: input.name,
        date: new Date(input.date),
        description: input.description,
        type: input.type,
        dungeonMasterId: (dm || {}).id || null,
        isDMLog: input.isDMLog,
        characterId: input.characterId,
        acp: input.acp,
        tcp: input.tcp,
        experience: input.experience,
        level: input.level,
        gold: input.gold
      };
      const log: Log = await ctx.prisma.log.upsert({
        where: {
          id: input.gameId
        },
        update: data,
        create: data
      });

      if (!log.id) throw new TRPCError({ message: "Could not save game", code: "INTERNAL_SERVER_ERROR" });

      const itemsToUpdate = input.magic_items_gained.filter(item => item.id);

      await ctx.prisma.magicItem.deleteMany({
        where: {
          logGainedId: log.id,
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
            logGainedId: log.id
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
          logLostId: log.id
        }
      });

      const storyAwardsToUpdate = input.story_awards_gained.filter(item => item.id);

      await ctx.prisma.storyAward.deleteMany({
        where: {
          logGainedId: log.id,
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
            gameGainedId: log.id
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
          logLostId: log.id
        }
      });

      return ctx.prisma.log.findFirst({
        where: {
          id: log.id
        }
      });
    }
  })
  .mutation("delete", {
    input: z.object({
      logId: z.string()
    }),
    async resolve({ input, ctx }) {
      await ctx.prisma.magicItem.updateMany({
        where: {
          logLostId: input.logId
        },
        data: {
          logLostId: null
        }
      });
      await ctx.prisma.magicItem.deleteMany({
        where: {
          logGainedId: input.logId
        }
      });
      await ctx.prisma.storyAward.updateMany({
        where: {
          logLostId: input.logId
        },
        data: {
          logLostId: null
        }
      });
      await ctx.prisma.storyAward.deleteMany({
        where: {
          logGainedId: input.logId
        }
      });
      return ctx.prisma.log.delete({
        where: {
          id: input.logId
        }
      });
    }
  });