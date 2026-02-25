import { Stat } from "./character";

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
