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
	name: string;
	level: number;
	xp: number;
	hp: Stat;
	str: Stat;
	dex: Stat;
	wil: Stat;
	pips: number;
	background: string;
	birthsign: string;
	coat: string;
	physicalDetail: string;
	pawGrid: GridItem[];   // 1x2 grid (1 row, 2 cols)
	bodyGrid: GridItem[];  // 1x2 grid (1 row, 2 cols)
	packGrid: GridItem[];  // 2x3 grid (2 rows, 3 cols)
	ground: Item[];        // temporary staging area
	log: string[];
}
