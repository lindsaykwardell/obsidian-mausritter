import { Item } from "../types/character";

export interface TreasureTableEntry {
	name: string;
	description: string;
	item: Omit<Item, "equipped">;
}

// ── Trinkets (d6) ──

export const trinkets: TreasureTableEntry[] = [
	{
		name: "Ghost lantern",
		description: "Casts a light that banishes ghosts",
		item: { name: "Ghost lantern", type: "gear", slots: 1, width: 1, height: 1, description: "Casts a light that banishes ghosts" },
	},
	{
		name: "Speaking shells",
		description: "One speaks what the other hears",
		item: { name: "Speaking shells", type: "gear", slots: 1, width: 1, height: 1, description: "One speaks what the other hears" },
	},
	{
		name: "Breathing straw",
		description: "Tube that always contains air",
		item: { name: "Breathing straw", type: "gear", slots: 1, width: 1, height: 1, description: "Tube that always contains air" },
	},
	{
		name: "Bat cultist's dagger",
		description: "Grants passage into sanctum",
		item: { name: "Bat cultist's dagger", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", description: "Grants passage into sanctum" },
	},
	{
		name: "Magic beans",
		description: "Grow fully in d6 Turns",
		item: { name: "Magic beans", type: "gear", slots: 1, width: 1, height: 1, description: "Grow fully in d6 Turns" },
	},
	{
		name: "Working human device",
		description: "Make up something fun",
		item: { name: "Working human device", type: "gear", slots: 1, width: 1, height: 1, description: "Working human device" },
	},
];

// ── Valuable treasure (d6) ──

export const valuables: TreasureTableEntry[] = [
	{
		name: "Wheel of fine aged cheese",
		description: "100p",
		item: { name: "Wheel of fine aged cheese", type: "gear", slots: 1, width: 1, height: 1, description: "100p" },
	},
	{
		name: "Silver chain",
		description: "2 slots, 500p",
		item: { name: "Silver chain", type: "gear", slots: 2, width: 2, height: 1, description: "500p" },
	},
	{
		name: "Jeweled pendant",
		description: "400p",
		item: { name: "Jeweled pendant", type: "gear", slots: 1, width: 1, height: 1, description: "400p" },
	},
	{
		name: "Gold ring",
		description: "500p",
		item: { name: "Gold ring", type: "gear", slots: 1, width: 1, height: 1, description: "500p" },
	},
	{
		name: "Polished diamond",
		description: "1000p",
		item: { name: "Polished diamond", type: "gear", slots: 1, width: 1, height: 1, description: "1000p" },
	},
	{
		name: "String of pearls",
		description: "2 slots, 1500p",
		item: { name: "String of pearls", type: "gear", slots: 2, width: 2, height: 1, description: "1500p" },
	},
];

// ── Large treasure (d6) ──

export const largeTreasure: TreasureTableEntry[] = [
	{
		name: "Oversized silver spoon",
		description: "2 slots, 300p",
		item: { name: "Oversized silver spoon", type: "gear", slots: 2, width: 2, height: 1, description: "300p" },
	},
	{
		name: "Ivory comb",
		description: "4 slots, 400p",
		item: { name: "Ivory comb", type: "gear", slots: 4, width: 2, height: 2, description: "400p" },
	},
	{
		name: "Huge bottle of fine brandy",
		description: "4 slots, 500p",
		item: { name: "Huge bottle of fine brandy", type: "gear", slots: 4, width: 2, height: 2, description: "500p" },
	},
	{
		name: "Ancient mouse statue",
		description: "4 slots, 500p",
		item: { name: "Ancient mouse statue", type: "gear", slots: 4, width: 2, height: 2, description: "500p" },
	},
	{
		name: "Ancient mouse throne",
		description: "6 slots, 1000p",
		item: { name: "Ancient mouse throne", type: "gear", slots: 6, width: 2, height: 2, description: "1000p" },
	},
	{
		name: "Giant golden wristwatch",
		description: "4 slots, 1000p",
		item: { name: "Giant golden wristwatch", type: "gear", slots: 4, width: 2, height: 2, description: "1000p" },
	},
];

// ── Unusual treasure (d6) ──

export const unusualTreasure: TreasureTableEntry[] = [
	{
		name: "Bundle of pungent herbs",
		description: "200p to an apothecary",
		item: { name: "Bundle of pungent herbs", type: "gear", slots: 1, width: 1, height: 1, description: "200p to an apothecary" },
	},
	{
		name: "Odd-coloured dried mushrooms",
		description: "200p to a witch",
		item: { name: "Odd-coloured dried mushrooms", type: "gear", slots: 1, width: 1, height: 1, description: "200p to a witch" },
	},
	{
		name: "Eerily glowing stone",
		description: "300p to a wizard",
		item: { name: "Eerily glowing stone", type: "gear", slots: 1, width: 1, height: 1, description: "300p to a wizard" },
	},
	{
		name: "Heirloom of sentimental value",
		description: "Sentimental value to a noblemouse",
		item: { name: "Heirloom of sentimental value", type: "gear", slots: 1, width: 1, height: 1, description: "Sentimental value to a noblemouse" },
	},
	{
		name: "Legal documents",
		description: "Granting land rights to the holder",
		item: { name: "Legal documents", type: "gear", slots: 1, width: 1, height: 1, description: "Granting land rights to the holder" },
	},
	{
		name: "Treasure map",
		description: "A map leading to hidden treasure",
		item: { name: "Treasure map", type: "gear", slots: 1, width: 1, height: 1, description: "Treasure map" },
	},
];

// ── Useful treasure (d6) — some entries generate multiple items or special results ──

export interface UsefulEntry {
	name: string;
	description: string;
	type: "rations" | "torches" | "weapon" | "armour" | "gear" | "helper";
}

export const usefulTreasure: UsefulEntry[] = [
	{ name: "Rations", description: "d6 packs of rations, well preserved", type: "rations" },
	{ name: "Torches", description: "d6 bundles of torches", type: "torches" },
	{ name: "Mundane weapon", description: "Mundane weapon", type: "weapon" },
	{ name: "Mundane armour", description: "Mundane armour", type: "armour" },
	{ name: "Mundane utility item", description: "Mundane utility item", type: "gear" },
	{ name: "Lost mouse", description: "Lost mouse, willing to help", type: "helper" },
];

// ── Magic sword weapon classes (d6) ──

export interface WeaponClass {
	label: string;
	damage: string;
	description: string;
	width: number;
	height: number;
	slots: number;
}

export const weaponClasses: { roll: [number, number]; entry: WeaponClass }[] = [
	{
		roll: [1, 4],
		entry: {
			label: "Medium",
			damage: "d6/d8",
			description: "Medium (d6 one paw/d8 both paws)",
			width: 2,
			height: 1,
			slots: 1,
		},
	},
	{
		roll: [5, 5],
		entry: {
			label: "Light",
			damage: "d6",
			description: "Light (d6 one paw, can be dual-wielded)",
			width: 1,
			height: 1,
			slots: 1,
		},
	},
	{
		roll: [6, 6],
		entry: {
			label: "Heavy",
			damage: "d10",
			description: "Heavy (d10 both paws)",
			width: 2,
			height: 1,
			slots: 2,
		},
	},
];

// ── Magic sword powers (d10) ──

export interface SwordPower {
	name: string;
	power: string;
}

export const swordPowers: SwordPower[] = [
	{ name: "Wrought iron", power: "While wielded: You roll critical damage Saves with Advantage" },
	{ name: "Intricate Fae design", power: "While wielded: You may disguise yourself as any mouse-sized creature" },
	{ name: "Rusty nail", power: "Critical damage: Give a Frightened Condition" },
	{ name: "Snake fang", power: "Critical damage: Deal d6 additional damage to DEX" },
	{ name: "Toy soldier's sabre", power: "While wielded: If you lead a warband, they have +1 Armour" },
	{ name: "Water-worn glass", power: "While wielded: You can hold breath underwater for 1 Turn" },
	{ name: "Wolf tooth", power: "Critical damage: Your next attack is Enhanced" },
	{ name: "Silver sewing needle", power: "Critical damage: Clear all usage dots from a non-spell item in your inventory" },
	{ name: "Thorny rose stem", power: "Critical damage: Remove a Condition" },
	{ name: "Congealed shadow", power: "While wielded: You are invisible when standing perfectly still" },
];

// ── Curse table (d6) ──

export interface CurseEntry {
	effect: string;
	liftedBy: string;
}

export const curses: CurseEntry[] = [
	{ effect: "Roll critical damage saves with Disadvantage", liftedBy: "Making a selfless sacrifice in a life or death situation" },
	{ effect: "When you gain an Exhausted Condition, gain another", liftedBy: "Trading places with a poor farmer for a season" },
	{ effect: "Make a WIL save to not attack when threatened", liftedBy: "Making lasting peace with a mortal enemy" },
	{ effect: "Reaction rolls are made with -1 modifier", liftedBy: "Giving away everything you own, no cheating" },
	{ effect: "If you see an ally take damage, take a Frightened Condition", liftedBy: "Fulfilling a mouse's dying wish" },
	{ effect: "Spells cast in your presence always mark usage", liftedBy: "Destroying an owl sorcerer's source of power" },
];
