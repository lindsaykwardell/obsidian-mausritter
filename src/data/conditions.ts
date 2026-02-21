export interface Condition {
	name: string;
	effect: string;
	clear: string;
	slots: number;
}

export const conditions: Condition[] = [
	{
		name: "Exhausted",
		effect: "Disadvantage on all saves. Cannot benefit from short rests.",
		clear: "Full rest at a safe haven.",
		slots: 1,
	},
	{
		name: "Frightened",
		effect: "Disadvantage on WIL saves. Must flee from source of fear.",
		clear: "Short rest in a safe location.",
		slots: 1,
	},
	{
		name: "Hungry",
		effect: "Disadvantage on STR saves. Cannot benefit from rests.",
		clear: "Eat a ration.",
		slots: 1,
	},
	{
		name: "Injured",
		effect: "Disadvantage on STR and DEX saves.",
		clear: "Full rest with medical treatment.",
		slots: 1,
	},
	{
		name: "Sick",
		effect: "Disadvantage on all saves. Cannot benefit from rests.",
		clear: "Herbal remedy or full rest at a safe haven.",
		slots: 1,
	},
];
