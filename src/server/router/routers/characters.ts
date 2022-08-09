import { createRouter } from "../context";
import { z } from "zod";
import type { Character, DungeonMaster, Game, MagicItem, StoryAward } from "@prisma/client";
import { TRPCError } from "@trpc/server";

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
        const levels = getLevels(character.games);
        const total_level = levels.total;
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
      const character: Character & {
        games: (Game & {
          dm: DungeonMaster;
          magic_items_gained: MagicItem[];
          magic_items_lost: MagicItem[];
          story_awards_gained: StoryAward[];
          story_awards_lost: StoryAward[];
        })[];
      } = await ctx.prisma.character.findFirstOrThrow({
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

      character.games.push({
        id: "test",
        name: "White Plume Mountain",
        date: new Date(),
        experience: 400,
        acp: 0,
        tcp: 0,
        level: 1,
        gold: 10000,
        description: "This is a test",
        characterId: character.id,
        dungeonMasterId: "test",
        dm: {
          id: "test",
          name: "Glenn Berman",
          DCI: null
        },
        created_at: new Date(),
        magic_items_gained: [
          {
            id: "t1",
            name: "5x Potion of Greater Healing",
            description: "This is a test",
            gameGainedId: "test",
            gameLostId: null
          }
        ],
        magic_items_lost: [],
        story_awards_gained: [],
        story_awards_lost: []
      });

      const levels = getLevels(character.games);

      const total_level = levels.total;
      const total_gold = character.games.reduce((acc, game) => acc + game.gold, 0);
      const magic_items: MagicItem[] = character.games.reduce((acc, game) => {
        acc.push(...game.magic_items_gained);
        game.magic_items_lost.forEach(magicItem => {
          acc.splice(magic_items.indexOf(magicItem), 1);
        });
        return acc;
      }, [] as MagicItem[]);
      const story_awards: StoryAward[] = character.games.reduce((acc, game) => {
        acc.push(...game.story_awards_gained);
        game.story_awards_lost.forEach(magicItem => {
          acc.splice(story_awards.indexOf(magicItem), 1);
        });
        return acc;
      }, [] as StoryAward[]);

      return {
        ...character,
        total_level,
        total_gold,
        magic_items,
        story_awards,
        game_levels: levels.game_levels,
        tier: total_level >= 17 ? 4 : total_level >= 11 ? 3 : total_level >= 5 ? 2 : 1
      };
    }
  });

function getLevels(games: Game[]) {
  if (!games) games = [];
  let totalLevel = 1;
  const game_levels: { id: string; levels: number }[] = [];

  const xpLevels = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  let totalXp = 0;
  let next = 1;
  let xpDiff = 0;
  games.forEach(game => {
    totalXp += game.experience;
    let current = xpLevels[next];
    let gained = 0;
    while (current && totalXp >= current) {
      gained++;
      next++;
      if (next < 20) {
        xpDiff = (totalXp - current) / ((xpLevels[next] as number) - current);
      }
      current = xpLevels[next];
    }
    if (gained > 0) game_levels.push({ id: game.id, levels: gained });
    totalLevel += gained;
  });

  if (totalLevel < 20) {
    const acpLevels = [0];
    for (let i = 1; i < 20; i++) acpLevels.push((acpLevels[i - 1] as number) + (i <= 3 ? 4 : 8));
    let totalAcp = Math.round((acpLevels[totalLevel - 1] as number) + xpDiff * (totalLevel <= 3 ? 4 : 8));
    let acpDiff = 0;
    next = totalLevel;
    games.forEach(game => {
      totalAcp += game.acp;
      let current = acpLevels[next];
      let gained = 0;
      while (current && totalAcp >= current) {
        gained++;
        next++;
        if (next < 20) {
          xpDiff = (totalXp - current) / ((xpLevels[next] as number) - current);
        }
        current = acpLevels[next];
      }
      if (gained > 0) {
        const leveled = game_levels.findIndex(level => level.id === game.id);
        if (leveled > -1) (game_levels[leveled] as typeof game_levels[number]).levels += gained;
        else game_levels.push({ id: game.id, levels: gained });
        totalLevel += gained;
      }
    });

    if (totalLevel < 20 && acpDiff > 0) totalLevel++;
  }

  games.forEach(game => {
    if (game.level > 0) {
      const leveled = game_levels.findIndex(level => level.id === game.id);
      if (leveled > -1) (game_levels[leveled] as typeof game_levels[number]).levels += game.level;
      else game_levels.push({ id: game.id, levels: game.level });
    }
  });

  totalLevel += games.reduce((acc, game) => acc + game.level, 0);

  return {
    total: Math.min(20, totalLevel),
    game_levels
  };
}
