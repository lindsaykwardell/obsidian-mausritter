import { Item } from "../types/character";
import { TreasureItem, TreasureHoard } from "../types/generator";
import { roll, d6, d10, d20 } from "./dice";
import {
	trinkets,
	valuables,
	largeTreasure,
	unusualTreasure,
	usefulTreasure,
	weaponClasses,
	swordPowers,
	curses,
} from "../data/treasure";
import { weapons, armour, gear } from "../data/items";
import { spellTemplates } from "../data/spells";

function pickRandom<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function rollWeaponClass() {
	const r = d6();
	for (const wc of weaponClasses) {
		if (r >= wc.roll[0] && r <= wc.roll[1]) return wc.entry;
	}
	return weaponClasses[0].entry;
}

export function generateMagicSword(): TreasureItem {
	const wc = rollWeaponClass();
	const powerRoll = d10();
	const sp = swordPowers[powerRoll - 1];

	let curse: { effect: string; liftedBy: string } | null = null;
	const curseRoll = d6();
	if (curseRoll === 1) {
		const curseEntry = curses[d6() - 1];
		curse = { effect: curseEntry.effect, liftedBy: curseEntry.liftedBy };
	}

	let description = `${wc.description}. ${sp.power}`;
	if (curse) {
		description += `. CURSED: ${curse.effect}. Lifted by: ${curse.liftedBy}`;
	}

	const item: Item = {
		name: sp.name,
		type: "weapon",
		slots: wc.slots,
		width: wc.width,
		height: wc.height,
		damage: wc.damage,
		usage: { total: 3, used: 0 },
		description,
	};

	return {
		name: sp.name,
		description: `${wc.label} magic sword`,
		category: "Magic Sword",
		item,
		power: sp.power,
		curse,
	};
}

function generateSpell(): TreasureItem {
	const template = pickRandom(spellTemplates);
	const item: Item = {
		name: template.name,
		type: "spell",
		slots: 1,
		width: 1,
		height: 1,
		description: template.description,
	};

	return {
		name: template.name,
		description: template.description,
		category: "Spell",
		item,
	};
}

function generateTrinket(): TreasureItem {
	const entry = trinkets[d6() - 1];
	return {
		name: entry.name,
		description: entry.description,
		category: "Trinket",
		item: { ...entry.item },
	};
}

function generateValuable(): TreasureItem {
	const entry = valuables[d6() - 1];
	return {
		name: entry.name,
		description: entry.description,
		category: "Valuable",
		item: { ...entry.item },
	};
}

function generateLarge(): TreasureItem {
	const entry = largeTreasure[d6() - 1];
	return {
		name: entry.name,
		description: entry.description,
		category: "Large",
		item: { ...entry.item },
	};
}

function generateUnusual(): TreasureItem {
	const entry = unusualTreasure[d6() - 1];
	return {
		name: entry.name,
		description: entry.description,
		category: "Unusual",
		item: { ...entry.item },
	};
}

function generateUseful(): TreasureItem {
	const entry = usefulTreasure[d6() - 1];

	switch (entry.type) {
		case "rations": {
			const count = d6();
			const item: Item = {
				name: "Rations",
				type: "gear",
				slots: 1,
				width: 1,
				height: 1,
				usage: { total: count, used: 0 },
				description: `${count} packs of rations`,
			};
			return { name: `${count} packs of rations`, description: entry.description, category: "Useful", item };
		}
		case "torches": {
			const count = d6();
			const item: Item = {
				name: "Torches",
				type: "gear",
				slots: 1,
				width: 1,
				height: 1,
				usage: { total: count, used: 0 },
				description: `${count} bundles of torches`,
			};
			return { name: `${count} bundles of torches`, description: entry.description, category: "Useful", item };
		}
		case "weapon": {
			const template = pickRandom(weapons);
			return {
				name: template.name,
				description: `Mundane weapon: ${template.name}`,
				category: "Useful",
				item: { ...template },
			};
		}
		case "armour": {
			const template = pickRandom(armour);
			return {
				name: template.name,
				description: `Mundane armour: ${template.name}`,
				category: "Useful",
				item: { ...template },
			};
		}
		case "gear": {
			const template = pickRandom(gear);
			return {
				name: template.name,
				description: `Mundane utility item: ${template.name}`,
				category: "Useful",
				item: { ...template },
			};
		}
		case "helper":
			return {
				name: "Lost mouse",
				description: "Lost mouse, willing to help",
				category: "Useful",
				item: { name: "Lost mouse", type: "gear", slots: 0, width: 1, height: 1, description: "Lost mouse, willing to help" },
			};
	}
}

function generatePips(multiplier: number): TreasureItem {
	const amount = d6() * multiplier;
	return {
		name: `${amount} pips`,
		description: `${amount} pips`,
		category: "Pips",
		item: { name: `${amount} pips`, type: "gear", slots: 0, width: 1, height: 1, description: `${amount} pips` },
	};
}

function resolveMainTableRoll(r: number): TreasureItem {
	if (r === 1) return generateMagicSword();
	if (r === 2) return generateSpell();
	if (r === 3) return generateTrinket();
	if (r === 4) return generateValuable();
	if (r === 5) return generateUnusual();
	if (r >= 6 && r <= 8) return generateLarge();
	if (r >= 9 && r <= 10) return generateUseful();
	if (r === 11) return generatePips(100);
	if (r >= 12 && r <= 14) return generatePips(50);
	if (r >= 15 && r <= 17) return generatePips(10);
	return generatePips(5);
}

export function generateTreasureHoard(bonusDice: number): TreasureHoard {
	const totalDice = 2 + bonusDice;
	const items: TreasureItem[] = [];

	for (let i = 0; i < totalDice; i++) {
		const r = d20();
		items.push(resolveMainTableRoll(r));
	}

	return { items, bonusDice };
}
