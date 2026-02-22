import { Item } from "../types/character";

type ItemTemplate = Omit<Item, "equipped">;

export const weapons: ItemTemplate[] = [
	// Light (1 paw, d6, 1x1)
	{ name: "Dagger", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", usage: { total: 3, used: 0 }, description: "Light" },
	{ name: "Needle", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", usage: { total: 3, used: 0 }, description: "Light" },
	{ name: "Spoon", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", usage: { total: 3, used: 0 }, description: "Light" },
	{ name: "Fishhook", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", usage: { total: 3, used: 0 }, description: "Light" },
	{ name: "Rolling pin", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", usage: { total: 3, used: 0 }, description: "Light" },
	// Versatile (1 paw, d6/d8, 1x1)
	{ name: "Sword", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Light, versatile" },
	// Medium (2 paws, d6/d8, 2x1)
	{ name: "Spear", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Medium" },
	{ name: "Club", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Medium" },
	{ name: "Hammer", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Medium" },
	{ name: "Saw", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Medium" },
	{ name: "Crook", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Medium" },
	{ name: "Axe", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Medium" },
	{ name: "Staff", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Medium" },
	{ name: "Hatchet", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Medium" },
	// Heavy (both paws, d10, 2x1)
	{ name: "Halberd", type: "weapon", slots: 2, width: 2, height: 1, damage: "d10", usage: { total: 3, used: 0 }, description: "Heavy" },
	{ name: "Heavy hammer", type: "weapon", slots: 2, width: 2, height: 1, damage: "d10", usage: { total: 3, used: 0 }, description: "Heavy" },
	{ name: "Trashhook", type: "weapon", slots: 2, width: 2, height: 1, damage: "d10", usage: { total: 3, used: 0 }, description: "Heavy" },
	{ name: "Pickaxe", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", usage: { total: 3, used: 0 }, description: "Medium" },
	// Ranged
	{ name: "Sling", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", usage: { total: 3, used: 0 }, description: "Ranged" },
	{ name: "Bow", type: "weapon", slots: 1, width: 2, height: 1, damage: "d8", usage: { total: 3, used: 0 }, description: "Heavy ranged" },
	{ name: "Light crossbow", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", usage: { total: 3, used: 0 }, description: "Ranged" },
	{ name: "Heavy crossbow", type: "weapon", slots: 2, width: 2, height: 1, damage: "d10", usage: { total: 3, used: 0 }, description: "Heavy ranged" },
];

export const armour: ItemTemplate[] = [
	{ name: "Shield", type: "armour", slots: 1, width: 1, height: 1, defence: 1, usage: { total: 3, used: 0 }, description: "Light, +1 armour" },
	{ name: "Lead coat", type: "armour", slots: 1, width: 2, height: 1, defence: 1, usage: { total: 3, used: 0 }, description: "Heavy, armour 1" },
	{ name: "Chain mail", type: "armour", slots: 1, width: 2, height: 1, defence: 1, usage: { total: 3, used: 0 }, description: "Heavy, armour 1" },
];

export const ammunition: ItemTemplate[] = [
	{ name: "Stones, pouch", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "Ammunition for slings" },
	{ name: "Arrows, quiver", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "Ammunition for bows" },
];

export const gear: ItemTemplate[] = [
	{ name: "Rope", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses" },
	{ name: "Lantern", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses" },
	{ name: "Cookpots", type: "gear", slots: 1, width: 1, height: 1, description: "Cook food" },
	{ name: "Magnifying glass", type: "gear", slots: 1, width: 1, height: 1, description: "Examine small things" },
	{ name: "Bottle of paint", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses" },
	{ name: "Needle & thread", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses" },
	{ name: "Herbs", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "Healing, 3 uses" },
	{ name: "Bag of seeds", type: "gear", slots: 1, width: 1, height: 1, description: "Plant things" },
	{ name: "Smoke bomb", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 1, used: 0 }, description: "1 use" },
	{ name: "Stink spray", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 1, used: 0 }, description: "1 use" },
	{ name: "Net", type: "gear", slots: 1, width: 1, height: 1, description: "Trap creatures" },
	{ name: "Lockpicks", type: "gear", slots: 1, width: 1, height: 1, description: "Pick locks" },
	{ name: "Disguise kit", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses" },
	{ name: "Wire", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses" },
	{ name: "Pliers", type: "gear", slots: 1, width: 1, height: 1, description: "Grip and bend" },
	{ name: "Compass", type: "gear", slots: 1, width: 1, height: 1, description: "Find north" },
	{ name: "Spyglass", type: "gear", slots: 1, width: 1, height: 1, description: "See far away" },
	{ name: "Cart", type: "gear", slots: 0, width: 1, height: 1, description: "6 extra inventory slots" },
	{ name: "Jar of honey", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses, sweet" },
	{ name: "Flask of spirits", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses" },
	{ name: "Musical instrument", type: "gear", slots: 1, width: 1, height: 1, description: "Play music" },
	{ name: "Holy symbol", type: "gear", slots: 1, width: 1, height: 1, description: "Religious icon" },
	{ name: "Glass vials", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses" },
	{ name: "Silver mirror", type: "gear", slots: 1, width: 1, height: 1, description: "Reflect light" },
	{ name: "Torches", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "Mark usage every 6 Turns" },
	{ name: "Rations", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "Mark usage after a meal" },
	{ name: "Bedroll", type: "gear", slots: 1, width: 1, height: 1, description: "Comfortable sleeping" },
	{ name: "Caltrops", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses, slow pursuers" },
	{ name: "Chalk", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses, mark surfaces" },
	{ name: "Chisel", type: "gear", slots: 1, width: 1, height: 1, description: "Carve stone" },
	{ name: "Crowbar", type: "gear", slots: 1, width: 1, height: 1, description: "Pry things open" },
	{ name: "Fishing rod", type: "gear", slots: 1, width: 1, height: 1, description: "Catch fish" },
	{ name: "Glue", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses, stick things" },
	{ name: "Grappling hook", type: "gear", slots: 1, width: 1, height: 1, description: "Climb, hook things" },
	{ name: "Ink & quill", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses, write things" },
	{ name: "Iron spikes", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses, secure doors" },
	{ name: "Metal file", type: "gear", slots: 1, width: 1, height: 1, description: "File through metal" },
	{ name: "Parchment", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses, write on" },
	{ name: "Pole", type: "gear", slots: 1, width: 2, height: 1, description: "10 feet, prod things" },
	{ name: "Pulleys", type: "gear", slots: 1, width: 1, height: 1, description: "Lift heavy things" },
	{ name: "Tent", type: "gear", slots: 1, width: 2, height: 1, description: "Shelter for 2 mice" },
	{ name: "Tinderbox", type: "gear", slots: 1, width: 1, height: 1, description: "Light fires" },
	{ name: "Twine", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses, tie things" },
	{ name: "Waterskin", type: "gear", slots: 1, width: 1, height: 1, usage: { total: 3, used: 0 }, description: "3 uses, carry water" },
];
