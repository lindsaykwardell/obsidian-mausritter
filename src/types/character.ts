export type CharacterType = "player" | "hireling" | "npc";

export interface Stat {
	current: number;
	max: number;
}

export interface UsageDots {
	total: number;
	used: number;
}

export interface Item {
	name: string;
	type: "weapon" | "armour" | "gear" | "spell" | "condition";
	slots: number; // how many inventory slots this occupies (1 or 2)
	width: number; // grid width (1 or 2)
	height: number; // grid height (1 or 2)
	usage?: UsageDots;
	damage?: string;
	defence?: number;
	description?: string;
	equipped?: boolean;
}

/** An item placed on a grid at a specific position */
export interface GridItem {
	item: Item;
	row: number;
	col: number;
}

export interface Character {
	id?: string;
	characterType: CharacterType;
	name: string;
	species: string;              // open-ended, defaults to "Mouse"
	level: number;
	xp: number;
	hp: Stat;
	str: Stat;
	dex: Stat;
	wil: Stat;
	pawGrid: GridItem[];   // 1x2 grid (1 row, 2 cols)
	bodyGrid: GridItem[];  // 1x2 grid (1 row, 2 cols)
	packGrid: GridItem[];  // 2x3 grid (players) or 1x2 grid (hirelings)
	ground: Item[];        // temporary staging area
	log: string[];

	// Grit slots (Level 2+): hold conditions, cleared on full rest
	gritSlots?: (Item | null)[];

	// Player-specific (optional)
	pips?: number;
	background?: string;
	birthsign?: string;
	coat?: string;
	physicalDetail?: string;

	// Hireling-specific (optional)
	hirelingType?: string;        // was HirelingData.type
	wagesPerDay?: number;
	fled?: boolean;

	// NPC-specific (optional)
	hexId?: number;               // hex index on the map (-1 or undefined = unassigned)
	lastName?: string;
	socialPosition?: string;
	disposition?: string;
	appearance?: string;
	quirk?: string;
	want?: string;
	relationship?: string;
}
