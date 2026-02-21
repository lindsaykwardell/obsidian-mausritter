/**
 * Backgrounds table: indexed by [HP roll (d6)][Pips roll (d6)]
 * Each entry: [background name, item1, item2]
 */
export const backgrounds: [string, string, string][][] = [
	// HP 1
	[
		["Test subject", "Spell: Light", "Lead coat (heavy, armour 1)"],
		["Kitchen forager", "Cookpots", "Spoon (light, d6)"],
		["Cage dweller", "Bottle of paint", "Brush"],
		["Hedge doctor", "Herbs", "Needle (light, d6)"],
		["Seed collector", "Bag of seeds", "Sling (ranged, d6)"],
		["Pale fur", "Luminous paint", "Lantern"],
	],
	// HP 2
	[
		["Militia mouse", "Spear (medium, d8)", "Shield (light, +1 armour)"],
		["Sewer rat", "Club (medium, d6/d8)", "Stink spray"],
		["Beekeeper", "Jar of honey", "Smoke bomb"],
		["Herbalist", "Pestle & mortar", "Healing herbs"],
		["Ale brewer", "Small barrel of ale", "Bottle"],
		["Travelling merchant", "Cart (6 slots)", "Magnifying glass"],
	],
	// HP 3
	[
		["Sailor", "Fishhook (light, d6)", "Rope (3 uses)"],
		["Blacksmith", "Hammer (medium, d6/d8)", "Metal file"],
		["Leatherworker", "Needle & thread", "Leather scraps"],
		["Carpenter", "Saw (medium, d6/d8)", "Wood glue"],
		["Farmer", "Pitchfork (medium, d8)", "Bag of grain"],
		["Tinker", "Pliers", "Wire (3 uses)"],
	],
	// HP 4
	[
		["Woodcutter", "Axe (medium, d8)", "Lantern"],
		["Ratcatcher", "Net", "Club (medium, d6/d8)"],
		["Shepherdess", "Crook (medium, d6/d8)", "Whistle"],
		["Message runner", "Sealed letter", "Lantern"],
		["Priest", "Holy symbol", "Censer"],
		["Cook", "Rolling pin (light, d6)", "Bag of flour"],
	],
	// HP 5
	[
		["Nobleman's son", "Rapier (light, d8)", "Fine clothes"],
		["Troubadour", "Musical instrument", "Disguise kit"],
		["Tax collector", "Ledger", "Quill & ink"],
		["Guard", "Halberd (heavy, d10)", "Lantern"],
		["Thief", "Lockpicks", "Dagger (light, d6)"],
		["Smuggler", "Flask of spirits", "Rope (3 uses)"],
	],
	// HP 6
	[
		["Witch's apprentice", "Spell: Be Understood", "Wand"],
		["Scholar", "Quill & ink", "Magnifying glass"],
		["Cartographer", "Blank map", "Compass"],
		["Astrologer", "Star chart", "Spyglass"],
		["Alchemist", "Glass vials", "Bunsen burner"],
		["Ghost hunter", "Silver mirror", "Spell: Ghost Sight"],
	],
];
