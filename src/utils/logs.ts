import type { DungeonMaster, Log, MagicItem, StoryAward } from "@prisma/client";

export function getLevels(logs: Log[], base: { level?: number; experience?: number; acp?: number } = { level: 0, experience: 0, acp: 0 }) {
	if (!logs) logs = [];
	let totalLevel = 1;
	const log_levels: { id: string; levels: number }[] = [];

	const xpLevels = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];
	let totalXp = base.level || 0;
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
		totalAcp += base.acp || 0;
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
				if (leveled > -1) (log_levels[leveled] as (typeof log_levels)[number]).levels += gained;
				else log_levels.push({ id: log.id, levels: gained });
				totalLevel += gained;
			}
		});

		if (totalLevel < 20 && acpDiff > 0) totalLevel++;
	}

	logs.forEach(log => {
		if (log.level > 0) {
			const leveled = log_levels.findIndex(level => level.id === log.id);
			if (leveled > -1) (log_levels[leveled] as (typeof log_levels)[number]).levels += log.level;
			else log_levels.push({ id: log.id, levels: log.level });
		}
	});

	totalLevel += logs.reduce((acc, log) => acc + log.level, 0);
	totalLevel += base.level || 0;

	return {
		total: Math.min(20, totalLevel),
		log_levels
	};
}

export const getLogsSummary = (
	logs: (Log & {
		dm: DungeonMaster | null;
		magic_items_gained: MagicItem[];
		magic_items_lost: MagicItem[];
		story_awards_gained: StoryAward[];
		story_awards_lost: StoryAward[];
	})[]
) => {
	logs = logs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

	const levels = getLevels(logs);

	const total_level = levels.total;
	const total_gold = logs.reduce((acc, log) => acc + log.gold, 0);
	const total_dtd = logs.reduce((acc, log) => acc + log.dtd, 0);
	const magic_items = logs.reduce((acc, log) => {
		acc.push(
			...log.magic_items_gained.filter(magicItem => {
				return !magicItem.logLostId;
			})
		);
		return acc;
	}, [] as MagicItem[]);
	const story_awards = logs.reduce((acc, log) => {
		acc.push(
			...log.story_awards_gained.filter(storyAward => {
				return !storyAward.logLostId;
			})
		);
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
