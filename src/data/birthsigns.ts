export interface Birthsign {
	name: string;
	disposition: string;
}

/** Birthsign table: roll d6 */
export const birthsigns: Birthsign[] = [
	{ name: "Star", disposition: "Brave / Reckless" },
	{ name: "Wheel", disposition: "Industrious / Ruthless" },
	{ name: "Acorn", disposition: "Inquisitive / Stubborn" },
	{ name: "Storm", disposition: "Generous / Wrathful" },
	{ name: "Moon", disposition: "Wise / Melancholic" },
	{ name: "Mother", disposition: "Nurturing / Possessive" },
];
