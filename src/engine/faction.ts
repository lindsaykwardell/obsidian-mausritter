import { Faction, FactionGoal } from "../types/generator";
import { factionNames, factionResources, factionGoalTemplates } from "../data/factions";
import { roll } from "./dice";

function pick<T>(arr: T[]): T {
	return arr[roll(arr.length) - 1];
}

function pickUnique<T>(arr: T[], count: number): T[] {
	const shuffled = [...arr].sort(() => Math.random() - 0.5);
	return shuffled.slice(0, count);
}

export function generateFaction(): Faction {
	const name = pick(factionNames);
	const resourceCount = roll(2) + 1; // 2-3
	const goalCount = roll(2) + 1; // 2-3

	const resources = pickUnique(factionResources, resourceCount);
	const goalTemplates = pickUnique(factionGoalTemplates, goalCount);
	const goals: FactionGoal[] = goalTemplates.map((t) => ({
		description: t.description,
		progress: 0,
		total: t.total,
	}));

	return { name, resources, goals };
}
