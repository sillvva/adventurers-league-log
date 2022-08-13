import type { Log, MagicItem, PrismaClient, StoryAward } from "@prisma/client";
import { z } from "zod";
import { createRouter } from "../context";

export const charactersRouter = createRouter()
  .query("getAll", {
    input: z.object({
      userId: z.string()
    }),
    async resolve({ input, ctx }) {
      return await getAll(ctx.prisma, input.userId);
    }
  })
  .query("getOne", {
    input: z.object({
      characterId: z.string()
    }),
    async resolve({ input, ctx }) {
      return await getOne(ctx.prisma, input.characterId);
    }
  });

export async function getOne(prisma: PrismaClient, characterId: string) {
  const character = await prisma.character.findFirstOrThrow({
    include: {
      user: true,
      logs: {
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
    where: { id: characterId }
  });

  // character.logs.push({
  //   id: "1234",
  //   date: new Date(),
  //   created_at: new Date(),
  //   name: "Test Game",
  //   description: "Test Game Description",
  //   type: "game",
  //   experience: 400,
  //   acp: 0,
  //   tcp: 0,
  //   level: 0,
  //   gold: 250,
  //   magic_items_gained: [{
  //     id: "123",
  //     name: "Test Magic Item",
  //     description: "Test Magic Item Description",
  //     gameGainedId: "1234",
  //     gameLostId: null
  //   }],
  //   magic_items_lost: [],
  //   story_awards_gained: [],
  //   story_awards_lost: [],
  //   dm: {
  //     id: "12",
  //     name: "Test DM",
  //     DCI: 1234,
  //     uid: null
  //   },
  //   is_dm_log: false,
  //   dungeonMasterId: "12",
  //   characterId: character.id
  // });

  const levels = getLevels(character.logs);

  const total_level = levels.total;
  const total_gold = character.logs.reduce((acc, log) => acc + log.gold, 0);
  const total_dtd = character.logs.reduce((acc, log) => acc + log.dtd, 0);
  const magic_items: MagicItem[] = character.logs.reduce((acc, log) => {
    acc.push(...log.magic_items_gained);
    log.magic_items_lost.forEach(magicItem => {
      acc.splice(acc.indexOf(magicItem), 1);
    });
    return acc;
  }, [] as MagicItem[]);
  const story_awards: StoryAward[] = character.logs.reduce((acc, log) => {
    acc.push(...log.story_awards_gained);
    log.story_awards_lost.forEach(magicItem => {
      acc.splice(acc.indexOf(magicItem), 1);
    });
    return acc;
  }, [] as StoryAward[]);

  return {
    ...character,
    total_level,
    total_gold,
    total_dtd,
    magic_items,
    story_awards,
    log_levels: levels.log_levels,
    tier: total_level >= 17 ? 4 : total_level >= 11 ? 3 : total_level >= 5 ? 2 : 1
  };
}

export async function getAll(prisma: PrismaClient, userId: string) {
  const characters = await prisma.character.findMany({
    include: {
      user: true,
      logs: {
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
    where: { userId: userId }
  });

  return characters.map(character => {
    const levels = getLevels(character.logs);
    const total_level = levels.total;
    const total_gold = character.logs.reduce((acc, log) => acc + log.gold, 0);
    const total_dtd = character.logs.reduce((acc, log) => acc + log.dtd, 0);
    const magic_items = character.logs.reduce((acc, log) => {
      acc.push(...log.magic_items_gained);
      log.magic_items_lost.forEach(magicItem => {
        acc.splice(magic_items.indexOf(magicItem), 1);
      });
      return acc;
    }, [] as MagicItem[]);
    const story_awards: StoryAward[] = character.logs.reduce((acc, log) => {
      acc.push(...log.story_awards_gained);
      log.story_awards_lost.forEach(magicItem => {
        acc.splice(acc.indexOf(magicItem), 1);
      });
      return acc;
    }, [] as StoryAward[]);


    return {
      ...character,
      total_level,
      total_gold,
      total_dtd,
      magic_items,
      story_awards,
      log_levels: levels.log_levels,
      tier: total_level >= 17 ? 4 : total_level >= 11 ? 3 : total_level >= 5 ? 2 : 1
    };
  });
}

function getLevels(logs: Log[]) {
  if (!logs) logs = [];
  let totalLevel = 1;
  const log_levels: { id: string; levels: number }[] = [];

  const xpLevels = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
  let totalXp = 0;
  let next = 1;
  let xpDiff = 0;
  logs.forEach(log => {
    totalXp += log.experience;
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
    if (gained > 0) log_levels.push({ id: log.id, levels: gained });
    totalLevel += gained;
  });

  if (totalLevel < 20) {
    const acpLevels = [0];
    for (let i = 1; i < 20; i++) acpLevels.push((acpLevels[i - 1] as number) + (i <= 3 ? 4 : 8));
    let totalAcp = Math.round((acpLevels[totalLevel - 1] as number) + xpDiff * (totalLevel <= 3 ? 4 : 8));
    let acpDiff = 0;
    next = totalLevel;
    logs.forEach(log => {
      totalAcp += log.acp;
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
        const leveled = log_levels.findIndex(level => level.id === log.id);
        if (leveled > -1) (log_levels[leveled] as typeof log_levels[number]).levels += gained;
        else log_levels.push({ id: log.id, levels: gained });
        totalLevel += gained;
      }
    });

    if (totalLevel < 20 && acpDiff > 0) totalLevel++;
  }

  logs.forEach(log => {
    if (log.level > 0) {
      const leveled = log_levels.findIndex(level => level.id === log.id);
      if (leveled > -1) (log_levels[leveled] as typeof log_levels[number]).levels += log.level;
      else log_levels.push({ id: log.id, levels: log.level });
    }
  });

  totalLevel += logs.reduce((acc, log) => acc + log.level, 0);

  return {
    total: Math.min(20, totalLevel),
    log_levels
  };
}
