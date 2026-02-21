import { Character, Stat } from "../types/character";
import { roll } from "./dice";

export interface AttackResult {
	damage: number;
	armourReduced: number;
	hpDamage: number;
	strDamage: number;
	criticalDamage: boolean;
}

/** Parse damage notation like "d6", "d8", "d10" and roll it */
export function rollDamage(notation: string): number {
	const match = notation.match(/d(\d+)/);
	if (!match) return 0;
	return roll(parseInt(match[1]));
}

/** Resolve an attack against a target. Damage goes HP -> STR, reduced by armour. */
export function resolveAttack(
	damage: number,
	targetArmour: number,
	targetHp: Stat,
	targetStr: Stat
): AttackResult {
	const armourReduced = Math.min(damage, targetArmour);
	const remaining = damage - armourReduced;

	let hpDamage = 0;
	let strDamage = 0;
	let criticalDamage = false;

	if (remaining > 0) {
		if (targetHp.current > 0) {
			hpDamage = Math.min(remaining, targetHp.current);
			const overflow = remaining - hpDamage;
			if (overflow > 0) {
				strDamage = overflow;
				criticalDamage = true;
			}
		} else {
			strDamage = remaining;
			criticalDamage = true;
		}
	}

	// Check for critical: if HP reaches 0, remaining damage goes to STR
	if (hpDamage > 0 && targetHp.current - hpDamage <= 0) {
		criticalDamage = true;
	}

	return { damage, armourReduced, hpDamage, strDamage, criticalDamage };
}

/** Apply attack result to character */
export function applyDamage(character: Character, result: AttackResult): void {
	character.hp.current = Math.max(0, character.hp.current - result.hpDamage);
	character.str.current = Math.max(0, character.str.current - result.strDamage);
}

/** Check if character is dead (STR reaches 0) */
export function isDead(character: Character): boolean {
	return character.str.current <= 0;
}

/** Check if character is incapacitated (HP reaches 0) */
export function isIncapacitated(character: Character): boolean {
	return character.hp.current <= 0;
}
