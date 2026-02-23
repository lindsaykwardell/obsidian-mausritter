import { Stat, GridItem, Item } from "./character";

export interface HirelingData {
	id?: string;
	name: string;
	type: string;           // "Torchbearer", "Mouse-at-arms", etc.
	level: number;
	xp: number;
	hp: Stat;
	str: Stat;
	dex: Stat;
	wil: Stat;
	wagesPerDay: number;    // in pips
	pawGrid: GridItem[];    // 1x2
	bodyGrid: GridItem[];   // 1x2
	packGrid: GridItem[];   // 1x2 (NOT 2x3 like characters)
	ground: Item[];
	log: string[];
	fled?: boolean;
}

export interface WarbandData {
	name: string;
	level: number;
	xp: number;
	hp: Stat;
	str: Stat;
	dex: Stat;
	wil: Stat;
	armour: number;
	damage: string;         // e.g., "d6"
	upkeepPerWeek: number;  // in pips (default 1000)
	notes: string;
	log: string[];
	routed?: boolean;
}
