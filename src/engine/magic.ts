import { rollMultiple, d6 } from "./dice";

export interface CastResult {
	spellName: string;
	power: number;
	dice: number[];
	diceCount: number;
	sum: number;
	resolvedText: string;
	miscast: boolean;
	miscastDamage: number;
}

/** Cast a spell at given power level. Roll [power]d6. Doubles/triples = miscast. */
export function castSpell(
	spellName: string,
	description: string,
	power: number
): CastResult {
	const dice = rollMultiple(power, 6);
	const sum = dice.reduce((a, b) => a + b, 0);

	// Check for miscast: any duplicates in the dice
	const miscast = hasDuplicates(dice);
	const miscastDamage = miscast ? sum : 0;

	// Resolve [DICE] and [SUM] in spell description
	const resolvedText = description
		.replace(/\[DICE\]/g, String(power))
		.replace(/\[SUM\]/g, String(sum));

	return {
		spellName,
		power,
		dice,
		diceCount: power,
		sum,
		resolvedText,
		miscast,
		miscastDamage,
	};
}

function hasDuplicates(arr: number[]): boolean {
	return new Set(arr).size !== arr.length;
}

/** Recharge a spell: roll d6, on 1-2 recover one usage dot */
export function rechargeSpell(): { roll: number; recharged: boolean } {
	const r = d6();
	return { roll: r, recharged: r <= 2 };
}
