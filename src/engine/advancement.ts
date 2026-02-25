import { Character } from "../types/character";
import { d6, roll3d6kh2 } from "./dice";

/** XP thresholds for leveling up. Level N requires xpThresholds[N-1] total XP. */
export const xpThresholds = [0, 1000, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000];

/** Grit capacity by level: Level 1 = 0, Level 2 = 1, Level 3-4 = 2, Level 5+ = 3 */
export function getGritCapacity(level: number): number {
	if (level <= 1) return 0;
	if (level === 2) return 1;
	if (level <= 4) return 2;
	return 3;
}

export function canLevelUp(character: Character): boolean {
	const nextLevel = character.level + 1;
	if (nextLevel > 10) return false;
	return character.xp >= (xpThresholds[nextLevel - 1] ?? Infinity);
}

export interface LevelUpResult {
	newLevel: number;
	hpIncrease: number;
	statIncreases: { stat: string; oldMax: number; newMax: number }[];
	log: string[];
}

/** Level up: increase HP by d6 (keep if higher), and roll for each stat improvement. */
export function levelUp(character: Character): LevelUpResult | null {
	if (!canLevelUp(character)) return null;

	const log: string[] = [];
	const statIncreases: { stat: string; oldMax: number; newMax: number }[] = [];

	character.level += 1;
	log.push(`Advanced to level ${character.level}!`);

	// Roll for HP
	const hpRoll = d6();
	const hpIncrease = Math.max(0, hpRoll - character.hp.max);
	if (hpIncrease > 0) {
		character.hp.max += hpIncrease;
		character.hp.current = character.hp.max;
		log.push(`HP increased by ${hpIncrease} to ${character.hp.max}.`);
	} else {
		character.hp.current = character.hp.max;
		log.push(`HP roll ${hpRoll} didn't exceed max ${character.hp.max}.`);
	}

	// Roll for each stat
	for (const statName of ["str", "dex", "wil"] as const) {
		const stat = character[statName];
		const statRoll = roll3d6kh2();
		if (statRoll.total > stat.max) {
			const oldMax = stat.max;
			stat.max = statRoll.total;
			stat.current = stat.max;
			statIncreases.push({ stat: statName.toUpperCase(), oldMax, newMax: stat.max });
			log.push(`${statName.toUpperCase()} increased from ${oldMax} to ${stat.max}.`);
		} else {
			log.push(`${statName.toUpperCase()} roll ${statRoll.total} didn't exceed max ${stat.max}.`);
		}
	}

	// Resize grit slots for the new level
	const gritCapacity = getGritCapacity(character.level);
	if (gritCapacity > 0) {
		if (!character.gritSlots) character.gritSlots = [];
		while (character.gritSlots.length < gritCapacity) {
			character.gritSlots.push(null);
		}
		log.push(`Grit slots: ${gritCapacity}`);
	}

	return {
		newLevel: character.level,
		hpIncrease,
		statIncreases,
		log,
	};
}
