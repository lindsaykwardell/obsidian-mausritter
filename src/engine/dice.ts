export function roll(sides: number): number {
	return Math.floor(Math.random() * sides) + 1;
}

export function rollMultiple(count: number, sides: number): number[] {
	return Array.from({ length: count }, () => roll(sides));
}

export function d4(): number { return roll(4); }
export function d6(): number { return roll(6); }
export function d8(): number { return roll(8); }
export function d10(): number { return roll(10); }
export function d12(): number { return roll(12); }
export function d20(): number { return roll(20); }

export function d66(): number {
	return roll(6) * 10 + roll(6);
}

export function rollWithAdvantage(sides: number): { rolls: number[]; result: number } {
	const rolls = [roll(sides), roll(sides)];
	return { rolls, result: Math.max(...rolls) };
}

export function rollWithDisadvantage(sides: number): { rolls: number[]; result: number } {
	const rolls = [roll(sides), roll(sides)];
	return { rolls, result: Math.min(...rolls) };
}

/** Roll 3d6, keep highest 2. Used for stat generation. */
export function roll3d6kh2(): { rolls: number[]; kept: number[]; total: number } {
	const rolls = rollMultiple(3, 6);
	const sorted = [...rolls].sort((a, b) => b - a);
	const kept = sorted.slice(0, 2);
	return { rolls, kept, total: kept[0] + kept[1] };
}

export interface DiceResult {
	notation: string;
	rolls: number[];
	total: number;
	advantage?: boolean;
	disadvantage?: boolean;
}

export function rollDice(
	count: number,
	sides: number,
	advantage?: boolean,
	disadvantage?: boolean
): DiceResult {
	if (advantage && count === 1) {
		const { rolls, result } = rollWithAdvantage(sides);
		return { notation: `1d${sides} (advantage)`, rolls, total: result, advantage: true };
	}
	if (disadvantage && count === 1) {
		const { rolls, result } = rollWithDisadvantage(sides);
		return { notation: `1d${sides} (disadvantage)`, rolls, total: result, disadvantage: true };
	}

	const rolls = rollMultiple(count, sides);
	const total = rolls.reduce((sum, r) => sum + r, 0);
	return { notation: `${count}d${sides}`, rolls, total };
}

/** Attribute save: roll d20 under stat current value to succeed */
export function attributeSave(statCurrent: number): { roll: number; success: boolean } {
	const r = d20();
	return { roll: r, success: r <= statCurrent };
}

/** Usage check: roll d6, on 4+ mark a usage dot */
export function usageCheck(): { roll: number; depleted: boolean } {
	const r = d6();
	return { roll: r, depleted: r >= 4 };
}
