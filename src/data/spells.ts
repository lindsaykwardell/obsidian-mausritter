import { SpellTemplate } from "../types/spell";

export const spellTemplates: SpellTemplate[] = [
	{
		name: "Fireball",
		description: "Shoot a fireball up to 24\". Deal [SUM] + [DICE] damage to all creatures within 6\".",
		recharge: "Burn a piece of wood",
		power: [1, 2, 3],
	},
	{
		name: "Heal",
		description: "Heal [SUM] STR damage and remove the Injured Condition from a creature.",
		recharge: "Bandage a wound",
		power: [1, 2, 3],
	},
	{
		name: "Magic Missile",
		description: "Deal [SUM] + [DICE] damage to a creature within sight.",
		recharge: "Break an item made of glass",
		power: [1, 2, 3],
	},
	{
		name: "Fear",
		description: "Give the Frightened Condition to [DICE] creatures.",
		recharge: "Scare an animal",
		power: [1, 2, 3],
	},
	{
		name: "Darkness",
		description: "Create a [SUM] x 2\" diameter sphere of pure darkness for [DICE] Turns.",
		recharge: "Sit alone in the dark for a Turn",
		power: [1, 2, 3],
	},
	{
		name: "Restore",
		description: "Remove Exhausted or Frightened Condition from [DICE] + 1 creatures.",
		recharge: "Eat a hearty meal",
		power: [1, 2, 3],
	},
	{
		name: "Be Understood",
		description: "Make your meaning clear to [DICE] creatures of another species for [DICE] Turns.",
		recharge: "Have a conversation with someone new",
		power: [1, 2, 3],
	},
	{
		name: "Ghost Beetle",
		description: "Create an illusory beetle that can carry 6 inventory slots for [DICE] x 6 Turns.",
		recharge: "Catch a beetle",
		power: [1, 2, 3],
	},
	{
		name: "Light",
		description: "Force [DICE] creatures to make a WIL save or become stunned. Alternately, create light as bright as a torch for [SUM] turns.",
		recharge: "Look at the sun",
		power: [1, 2, 3],
	},
	{
		name: "Invisible Ring",
		description: "Creates [DICE] x 6\" ring of force. It is invisible and immovable. Lasts [DICE] Turns.",
		recharge: "Tie a knot in a rope",
		power: [1, 2, 3],
	},
	{
		name: "Knock",
		description: "Open a door or container, as if a Save were made with STR score of 10 + [DICE] x 4.",
		recharge: "Open a lock with a key",
		power: [1, 2, 3],
	},
	{
		name: "Grease",
		description: "Cover [DICE] x 6\" area in slippery, flammable grease. Creatures in the area must make a DEX save or fall prone.",
		recharge: "Oil a squeaky hinge",
		power: [1, 2, 3],
	},
	{
		name: "Grow",
		description: "Grow a creature to [DICE] + 1 times its original size for 1 Turn.",
		recharge: "Water a plant",
		power: [1, 2, 3],
	},
	{
		name: "Invisibility",
		description: "Make creature invisible for [DICE] Turns. Any movement reduces duration by 1 Turn.",
		recharge: "Close your eyes for a Turn",
		power: [1, 2, 3],
	},
	{
		name: "Catnip",
		description: "Turn object into an irresistible lure for cats. Lasts [DICE] Turns.",
		recharge: "Pet a cat",
		power: [1, 2, 3],
	},
];
