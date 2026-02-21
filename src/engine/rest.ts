import { Character } from "../types/character";

/** Short rest: restore HP to max. Requires a safe place and a few minutes. */
export function shortRest(character: Character): string[] {
	const log: string[] = [];
	if (character.hp.current < character.hp.max) {
		character.hp.current = character.hp.max;
		log.push(`HP restored to ${character.hp.max}.`);
	} else {
		log.push("HP already full.");
	}
	return log;
}

/** Long rest: restore HP and one attribute to max. Requires a safe place, food, and several hours. */
export function longRest(character: Character, restoreStat?: "str" | "dex" | "wil"): string[] {
	const log: string[] = [];

	// Restore HP
	if (character.hp.current < character.hp.max) {
		character.hp.current = character.hp.max;
		log.push(`HP restored to ${character.hp.max}.`);
	}

	// Restore one stat
	if (restoreStat) {
		const stat = character[restoreStat];
		if (stat.current < stat.max) {
			stat.current = stat.max;
			log.push(`${restoreStat.toUpperCase()} restored to ${stat.max}.`);
		}
	}

	if (log.length === 0) log.push("Already fully rested.");
	return log;
}

/** Full rest: restore all attributes and HP. Requires a safe haven, food, and a full day. */
export function fullRest(character: Character): string[] {
	const log: string[] = [];

	character.hp.current = character.hp.max;
	character.str.current = character.str.max;
	character.dex.current = character.dex.max;
	character.wil.current = character.wil.max;

	log.push("Fully rested. All stats restored to max.");

	// Remove conditions from all grids
	for (const grid of [character.pawGrid, character.bodyGrid, character.packGrid]) {
		if (!grid) continue;
		for (let i = grid.length - 1; i >= 0; i--) {
			if (grid[i].item.type === "condition") {
				log.push(`Cleared condition: ${grid[i].item.name}`);
				grid.splice(i, 1);
			}
		}
	}

	return log;
}
