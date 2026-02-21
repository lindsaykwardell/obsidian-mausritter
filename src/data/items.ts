import { Item } from "../types/character";

type ItemTemplate = Omit<Item, "equipped">;

export const weapons: ItemTemplate[] = [
	{ name: "Dagger", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", description: "Light" },
	{ name: "Sword", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", description: "Light" },
	{ name: "Needle", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", description: "Light" },
	{ name: "Spoon", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", description: "Light" },
	{ name: "Fishhook", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", description: "Light" },
	{ name: "Rolling pin", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", description: "Light" },
	{ name: "Rapier", type: "weapon", slots: 1, width: 1, height: 1, damage: "d8", description: "Light" },
	{ name: "Spear", type: "weapon", slots: 1, width: 2, height: 1, damage: "d8", description: "Medium" },
	{ name: "Club", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", description: "Medium, versatile" },
	{ name: "Hammer", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", description: "Medium" },
	{ name: "Saw", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", description: "Medium" },
	{ name: "Crook", type: "weapon", slots: 1, width: 2, height: 1, damage: "d6/d8", description: "Medium" },
	{ name: "Pitchfork", type: "weapon", slots: 1, width: 2, height: 1, damage: "d8", description: "Medium" },
	{ name: "Axe", type: "weapon", slots: 1, width: 2, height: 1, damage: "d8", description: "Medium" },
	{ name: "Halberd", type: "weapon", slots: 2, width: 2, height: 1, damage: "d10", description: "Heavy" },
	{ name: "Sling", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", description: "Ranged" },
	{ name: "Bow", type: "weapon", slots: 1, width: 1, height: 1, damage: "d6", description: "Ranged" },
];

export const armour: ItemTemplate[] = [
	{ name: "Shield", type: "armour", slots: 1, width: 1, height: 1, defence: 1, description: "Light, +1 armour" },
	{ name: "Lead coat", type: "armour", slots: 1, width: 2, height: 1, defence: 1, description: "Heavy, armour 1" },
	{ name: "Chain mail", type: "armour", slots: 1, width: 2, height: 1, defence: 1, description: "Heavy, armour 1" },
	{ name: "Plate armour", type: "armour", slots: 2, width: 2, height: 1, defence: 2, description: "Heavy, armour 2" },
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
];
