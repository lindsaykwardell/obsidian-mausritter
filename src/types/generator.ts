export interface Settlement {
	name: string;
	population: string;
	disposition: string;
	feature: string;
	industry: string;
	event: string;
	npcs: NpcSummary[];
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

/** Simplified NPC data used by the generator renderer's ephemeral display */
export interface NpcSummary {
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
	paymentForService: string;
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
	isPoorWeather: boolean;
	roll: number;
	seasonalEvent?: string;
}

export interface EncounterResult {
	roll: number;
	result: "encounter" | "omen" | "nothing";
	prompt: string;
}

export interface ReactionResult {
	roll: number;
	reaction: string;
	prompt: string;
}

export interface AdventureSeed {
	seed: string;
}

export type HexTerrain = "countryside" | "forest" | "river" | "human town";

export interface Construction {
	type: string;
	count: number;
	costPerUnit: number;
}

export interface SettlementBank {
	pips: number;
	items: import("./character").Item[];
}

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
	npcs: import("./character").Character[];
	constructions?: Construction[];
	bank?: SettlementBank;
}

export interface MapHex {
	id: number;
	name: string;
	terrain: HexTerrain;
	landmark: string;
	description: string;
	settlement: MapSettlement | null;
	npcs: import("./character").Character[];
}

export interface HexMap {
	name: string;
	hexes: MapHex[];
	selectedHex: number;
	partyHex: number;
	/** NPC UUIDs currently in edit mode (transient UI state) */
	editingNpcs?: string[];
}

export interface AdventureSiteRoom {
	id: number;
	row: number;
	col: number;
	type: string;
	description: string;
	creature: boolean;
	treasure: boolean;
}

export interface AdventureSite {
	name: string;
	construction: string;
	ruinAction: string;
	ruination: string;
	inhabitant: string;
	inhabitantAction: string;
	inhabitantGoal: string;
	secretHidden: string;
	secret: string;
	rooms: AdventureSiteRoom[];
	gridRows: number;
	gridCols: number;
	selectedRoom: number;
	partyMembers: { name: string; roomId: number }[];
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

export interface TreasureItem {
	name: string;
	description: string;
	category: string;
	item: import("./character").Item;
	curse?: { effect: string; liftedBy: string } | null;
	power?: string;
	pickedUp?: boolean;
	pickedUpBy?: string;
}

export interface TreasureHoard {
	items: TreasureItem[];
	bonusDice: number;
}
