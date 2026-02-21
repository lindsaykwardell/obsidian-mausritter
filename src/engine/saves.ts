import { Character } from "../types/character";
import { d20 } from "./dice";

export type StatName = "str" | "dex" | "wil";

export interface SaveResult {
	stat: StatName;
	statValue: number;
	roll: number;
	success: boolean;
}

export function rollSave(character: Character, stat: StatName): SaveResult {
	const statValue = character[stat].current;
	const r = d20();
	return {
		stat,
		statValue,
		roll: r,
		success: r <= statValue,
	};
}
