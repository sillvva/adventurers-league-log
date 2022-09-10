import { getLevels } from "$src/server/router/helpers";
import type { DungeonMaster, Log, MagicItem, StoryAward } from "@prisma/client";

export const getLogsSummary = (
	logs: (Log & {
    dm: DungeonMaster | null;
		magic_items_gained: MagicItem[];
		magic_items_lost: MagicItem[];
		story_awards_gained: StoryAward[];
		story_awards_lost: StoryAward[];
	})[]
) => {
	const levels = getLevels(logs);

	const total_level = levels.total;
	const total_gold = logs.reduce((acc, log) => acc + log.gold, 0);
	const total_dtd = logs.reduce((acc, log) => acc + log.dtd, 0);
	const magic_items = logs.reduce((acc, log) => {
		acc.push(...log.magic_items_gained);
		log.magic_items_lost.forEach(magicItem => {
			acc.splice(
				acc.findIndex(a => a.id === magicItem.id),
				1
			);
		});
		return acc;
	}, [] as MagicItem[]);
	const story_awards = logs.reduce((acc, log) => {
		acc.push(...log.story_awards_gained);
		log.story_awards_lost.forEach(storyAward => {
			acc.splice(
				acc.findIndex(a => a.id === storyAward.id),
				1
			);
		});
		return acc;
	}, [] as StoryAward[]);

	return {
		total_level,
		total_gold,
		total_dtd,
		magic_items,
		story_awards,
		log_levels: levels.log_levels,
		tier: total_level >= 17 ? 4 : total_level >= 11 ? 3 : total_level >= 5 ? 2 : 1,
		logs: logs.map(log => ({ ...log, saving: false }))
	};
};
