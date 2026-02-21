import { SpellTemplate } from "../types/spell";

export const spellTemplates: SpellTemplate[] = [
	{
		name: "Light",
		description: "Create [DICE] hovering lights, as bright as a torch. Lasts 10 minutes per power level.",
		power: [1, 2, 3],
	},
	{
		name: "Be Understood",
		description: "For [SUM] minutes, you can communicate with any creature.",
		power: [1, 2, 3],
	},
	{
		name: "Ghost Sight",
		description: "For [SUM] minutes, you can see invisible and ethereal creatures.",
		power: [1, 2, 3],
	},
	{
		name: "Darkness",
		description: "Create a [DICE]x10ft sphere of magical darkness. Lasts 10 minutes per power level.",
		power: [1, 2, 3],
	},
	{
		name: "Fear",
		description: "[DICE] creatures must make a WIL save or flee for [SUM] rounds.",
		power: [1, 2, 3],
	},
	{
		name: "Fireball",
		description: "Throw a ball of fire dealing [SUM] damage to all in a 20ft area.",
		power: [1, 2, 3],
	},
	{
		name: "Heal",
		description: "Restore [SUM] STR to a creature you touch.",
		power: [1, 2, 3],
	},
	{
		name: "Invisible",
		description: "Become invisible for [SUM] minutes. Broken by attacking.",
		power: [1, 2, 3],
	},
	{
		name: "Knock",
		description: "Open [DICE] locked doors or containers.",
		power: [1, 2, 3],
	},
	{
		name: "Levitate",
		description: "Float [SUM] feet off the ground for [DICE] minutes.",
		power: [1, 2, 3],
	},
	{
		name: "Magic Missile",
		description: "Fire [DICE] darts of magical energy, each dealing d4 damage.",
		power: [1, 2, 3],
	},
	{
		name: "Mirror Image",
		description: "Create [DICE] illusory copies of yourself. Each absorbs one hit.",
		power: [1, 2, 3],
	},
	{
		name: "Shield",
		description: "Gain [DICE] armour for [SUM] rounds.",
		power: [1, 2, 3],
	},
	{
		name: "Sleep",
		description: "[SUM] HD of creatures fall asleep for 10 minutes.",
		power: [1, 2, 3],
	},
	{
		name: "Telekinesis",
		description: "Move an object up to [SUM] pounds with your mind for [DICE] minutes.",
		power: [1, 2, 3],
	},
	{
		name: "Speak with Dead",
		description: "Ask [DICE] questions of a dead creature. It must answer truthfully.",
		power: [1, 2, 3],
	},
];
