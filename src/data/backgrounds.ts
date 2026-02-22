/**
 * Backgrounds table: indexed by [HP roll (d6)][Pips roll (d6)]
 * Each entry: [background name, item1, item2]
 */
export const backgrounds: [string, string, string][][] = [
	// HP 1
	[
		["Test subject", "Spell: Magic missile", "Lead coat"],
		["Kitchen forager", "Shield", "Cookpots"],
		["Cage dweller", "Spell: Be understood", "Bottle of milk"],
		["Hedge witch", "Spell: Heal", "Incense stick"],
		["Leatherworker", "Shield", "Shears"],
		["Street tough", "Dagger", "Flask of coffee"],
	],
	// HP 2
	[
		["Mendicant priest", "Spell: Restore", "Holy symbol"],
		["Beetleherd", "Hireling: Loyal beetle", "Pole"],
		["Ale brewer", "Hireling: Drunken torchbearer", "Small barrel of ale"],
		["Fishermouse", "Net", "Needle"],
		["Blacksmith", "Hammer", "Metal file"],
		["Wireworker", "Wire", "Electric lantern"],
	],
	// HP 3
	[
		["Woodcutter", "Axe", "Twine"],
		["Bat cultist", "Spell: Darkness", "Bag of bat teeth"],
		["Tin miner", "Pickaxe", "Lantern"],
		["Trash collector", "Trashhook", "Silver mirror"],
		["Wall rover", "Fishhook", "Needle & thread"],
		["Merchant", "Hireling: Pack rat", "20p IOU from a noblemouse"],
	],
	// HP 4
	[
		["Raft crew", "Hammer", "Iron spikes"],
		["Worm wrangler", "Pole", "Soap"],
		["Sparrow rider", "Fishhook", "Goggles"],
		["Sewer guide", "Metal file", "Needle & thread"],
		["Prison guard", "Chain", "Spear"],
		["Fungus farmer", "Rations", "Spore mask"],
	],
	// HP 5
	[
		["Dam builder", "Shovel", "Iron spikes"],
		["Cartographer", "Ink & quill", "Compass"],
		["Trap thief", "Block of cheese", "Glue"],
		["Vagabond", "Tent", "Treasure map"],
		["Grain farmer", "Spear", "Whistle"],
		["Message runner", "Bedroll", "Sealed documents"],
	],
	// HP 6
	[
		["Troubadour", "Musical instrument", "Disguise kit"],
		["Gambler", "Loaded dice", "Silver mirror"],
		["Sap tapper", "Bucket", "Iron spikes"],
		["Bee keeper", "Jar of honey", "Net"],
		["Librarian", "Scrap of obscure book", "Ink & quill"],
		["Pauper noblemouse", "Felt hat", "Perfume"],
	],
];
