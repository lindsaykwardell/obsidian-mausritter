import { HirelingData, WarbandData } from "../types/hireling";
import { hirelingTemplates } from "../data/hirelings";
import { d6, d20, rollMultiple } from "./dice";
import { mouseNames, mouseLastNames, settlementStartNames, settlementEndNames } from "../data/names";

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function generateHirelingName(): string {
	return `${pick(mouseNames)} ${pick(mouseLastNames)}`;
}

const warbandTitles = [
	"Battalion", "Brigade", "Company", "Defenders", "Guard",
	"Lancers", "Legion", "Militia", "Paws", "Rangers",
	"Sentinels", "Shields", "Swords", "Vanguard", "Wardens",
	"Watchers", "Blades", "Claws", "Scouts", "Stalwarts",
];

const warbandAdjectives = [
	"Bold", "Brave", "Crimson", "Daring", "Fearless",
	"Fierce", "Free", "Gilded", "Grim", "Hardy",
	"Iron", "Loyal", "Merry", "Muddy", "Ragged",
	"Steadfast", "Thorny", "True", "Unbowed", "Wild",
];

function generateWarbandName(vaultNames?: string[]): string {
	// Pick a naming style at random
	const style = Math.floor(Math.random() * 4);

	switch (style) {
		case 0: {
			// "[Adjective] [Title] of [Settlement]"
			const settlement = `${pick(settlementStartNames)}${pick(settlementEndNames)}`;
			return `${pick(warbandAdjectives)} ${pick(warbandTitles)} of ${settlement}`;
		}
		case 1: {
			// "[LastName]'s [Title]"
			const source = vaultNames && vaultNames.length > 0 ? vaultNames : mouseLastNames;
			return `${pick(source)}'s ${pick(warbandTitles)}`;
		}
		case 2: {
			// "The [Settlement] [Title]"
			const settlement = `${pick(settlementStartNames)}${pick(settlementEndNames)}`;
			return `The ${settlement} ${pick(warbandTitles)}`;
		}
		default: {
			// "The [Adjective] [Title]"
			return `The ${pick(warbandAdjectives)} ${pick(warbandTitles)}`;
		}
	}
}

export function generateHireling(typeName: string): HirelingData {
	const template = hirelingTemplates.find(t => t.type === typeName);
	const wages = template?.wagesPerDay ?? 1;

	const strRolls = rollMultiple(2, 6);
	const dexRolls = rollMultiple(2, 6);
	const wilRolls = rollMultiple(2, 6);
	const strVal = strRolls[0] + strRolls[1];
	const dexVal = dexRolls[0] + dexRolls[1];
	const wilVal = wilRolls[0] + wilRolls[1];
	const hpVal = d6();
	const name = generateHirelingName();

	return {
		id: crypto.randomUUID(),
		name,
		type: typeName,
		level: 1,
		xp: 0,
		hp: { current: hpVal, max: hpVal },
		str: { current: strVal, max: strVal },
		dex: { current: dexVal, max: dexVal },
		wil: { current: wilVal, max: wilVal },
		wagesPerDay: wages,
		pawGrid: [],
		bodyGrid: [],
		packGrid: [],
		ground: [],
		log: [`Recruited ${name} the ${typeName} — HP ${hpVal}, STR ${strVal}, DEX ${dexVal}, WIL ${wilVal}`],
		fled: false,
	};
}

export function generateWarband(vaultNames?: string[]): WarbandData {
	const hpVal = d6();
	const name = generateWarbandName(vaultNames);

	return {
		name,
		level: 1,
		xp: 0,
		hp: { current: hpVal, max: hpVal },
		str: { current: 10, max: 10 },
		dex: { current: 10, max: 10 },
		wil: { current: 10, max: 10 },
		armour: 0,
		damage: "d6",
		upkeepPerWeek: 1000,
		notes: "",
		log: [`${name} formed — HP ${hpVal}, STR 10, DEX 10, WIL 10`],
		routed: false,
	};
}

export interface MoraleResult {
	roll: number;
	wilValue: number;
	fled: boolean;
}

export function rollMorale(data: HirelingData | WarbandData): MoraleResult {
	const wilValue = data.wil.current;
	const r = d20();
	return {
		roll: r,
		wilValue,
		fled: r > wilValue,
	};
}
