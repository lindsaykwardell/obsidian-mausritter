export interface Attack {
	name: string;
	damage: string;
	target?: string;
}

export interface Creature {
	name: string;
	str: number;
	dex: number;
	wil: number;
	hp: number;
	hpCurrent?: number;
	armour: number;
	attacks: Attack[];
	criticalDamage?: string;
	notes?: string;
	wantAndDont?: string;
	incapacitated?: boolean;
}
