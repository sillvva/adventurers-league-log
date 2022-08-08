import { createRouter } from "../context";
import { z } from "zod";
import type { Game, MagicItem } from "@prisma/client";

export const charactersRouter = createRouter()
  .query("getAll", {
    input: z.object({
      userId: z.string().optional()
    }),
    async resolve({ input, ctx }) {
      const characters = await ctx.prisma.character.findMany({
        include: {
          user: true,
          games: {
            include: {
              dm: true,
              magic_items_gained: true,
              magic_items_lost: true,
              story_awards_gained: true,
              story_awards_lost: true
            },
            orderBy: {
              date: "asc"
            }
          }
        },
        where: { userId: input.userId }
      });

      return characters.map(character => {
        const total_level = getTotalLevel(character.games);
        const total_gold = character.games.reduce((acc, game) => acc + game.gold, 0);
        const magic_items = character.games.reduce((acc, game) => {
          acc.push(...game.magic_items_gained);
          game.magic_items_lost.forEach(magicItem => {
            acc.splice(magic_items.indexOf(magicItem), 1);
          });
          return acc;
        }, [] as MagicItem[]);

        return {
          ...character,
          total_level,
          total_gold,
          magic_items,
          tier: total_level >= 17 ? 4 : total_level >= 11 ? 3 : total_level >= 5 ? 2 : 1
        };
      });
    }
  })
  .query("getOne", {
    input: z.object({
      id: z.string().optional()
    }),
    async resolve({ input, ctx }) {
      const character = await ctx.prisma.character.findFirstOrThrow({
        include: {
          user: true,
          games: {
            include: {
              dm: true,
              magic_items_gained: true,
              magic_items_lost: true,
              story_awards_gained: true,
              story_awards_lost: true
            },
            orderBy: {
              date: "asc"
            }
          }
        },
        where: { id: input.id }
      });

      const total_level = getTotalLevel(character.games);
      const total_gold = character.games.reduce((acc, game) => acc + game.gold, 0);
      const magic_items = character.games.reduce((acc, game) => {
        acc.push(...game.magic_items_gained);
        game.magic_items_lost.forEach(magicItem => {
          acc.splice(magic_items.indexOf(magicItem), 1);
        });
        return acc;
      }, [] as MagicItem[]);

      return {
        ...character,
        total_level,
        total_gold,
        magic_items,
        tier: total_level >= 17 ? 4 : total_level >= 11 ? 3 : total_level >= 5 ? 2 : 1
      };
    }
  });

function getTotalLevel(games: Game[]) {
  if (!games) games = [];
  let totalLevel = 0;

  const totalXp = games.reduce((acc, game) => acc + game.experience, 0);
  const xpLevels = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  let xpDiff = 0;
  xpLevels.forEach((levelXp, index) => {
    if (totalXp >= levelXp) {
      totalLevel = index + 1;
      if (index < 19) {
        xpDiff = (totalXp - levelXp) / ((xpLevels[index + 1] as number) - levelXp);
      }
    }
  });

  if (totalLevel < 20) {
    const acpLevels = [0];
    for (let i = 1; i < 20; i++) acpLevels.push((acpLevels[i - 1] as number) + (i <= 3 ? 4 : 8));
    let totalAcp = games.reduce(
      (acc, game) => acc + game.acp,
      Math.round(((acpLevels[totalLevel] as number) - (acpLevels[totalLevel - 1] as number)) * xpDiff)
    );
    let acpDiff = 0;
    acpLevels.forEach((levelAcp, index) => {
      if (totalAcp >= levelAcp) {
        totalLevel = index + 1;
        if (index < 19) {
          acpDiff = (totalAcp - levelAcp) / ((acpLevels[index + 1] as number) - levelAcp);
        }
      }
    });

    if (totalLevel < 20 && acpDiff > 0) totalLevel++;
  }

  totalLevel += games.reduce((acc, game) => acc + game.level, 0);

  return Math.min(20, totalLevel);
}
