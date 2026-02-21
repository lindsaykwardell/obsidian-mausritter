import { UsageDots } from "./character";

export interface SpellTemplate {
	name: string;
	description: string;
	repierceDuration?: string;
	power: number[]; // e.g. [1, 2, 3] — dice count options
}

export interface SpellState {
	name: string;
	usage: UsageDots;
	power: number;
	log: string[];
}
