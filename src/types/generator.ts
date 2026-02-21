export interface Settlement {
	name: string;
	population: string;
	disposition: string;
	feature: string;
	industry: string;
	event: string;
	npcs: NPC[];
}

export interface HexFeature {
	type: string;
	description: string;
}

export interface Hex {
	terrain: string;
	landmark: string;
	feature: HexFeature;
}

export interface NPC {
	name: string;
	lastName: string;
	socialPosition: string;
	birthsign: string;
	disposition: string;
	appearance: string;
	quirk: string;
	want: string;
	relationship: string;
	hp: number;
	str: number;
	dex: number;
	wil: number;
	items: string[];
	hexId: number;
}

export interface Hireling {
	name: string;
	hp: number;
	str: number;
	dex: number;
	wil: number;
	skill: string;
	cost: string;
}

export interface WeatherResult {
	season: string;
	weather: string;
}

export interface AdventureSeed {
	seed: string;
}

export type HexTerrain = "countryside" | "forest" | "river" | "human town";

export interface MapSettlement {
	name: string;
	size: number;
	sizeLabel: string;
	governance: string;
	detail: string;
	features: string[];
	industries: string[];
	event: string;
	taverns: { name: string; specialty: string }[];
	npcs: NPC[];
}

export interface MapHex {
	id: number;
	name: string;
	terrain: HexTerrain;
	landmark: string;
	description: string;
	settlement: MapSettlement | null;
	npcs: NPC[];
}

export interface HexMap {
	name: string;
	hexes: MapHex[];
	selectedHex: number;
	partyHex: number;
}

export interface FactionGoal {
	description: string;
	progress: number;
	total: number;
}

export interface Faction {
	name: string;
	resources: string[];
	goals: FactionGoal[];
}

export interface FactionTracker {
	factions: Faction[];
}
