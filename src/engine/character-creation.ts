import { Character, Item, GridItem } from "../types/character";
import { roll, d6, roll3d6kh2 } from "./dice";
import { placeOnGrid, PACK_ROWS, PACK_COLS, PAW_ROWS, PAW_COLS, BODY_ROWS, BODY_COLS } from "./inventory";
import { backgrounds } from "../data/backgrounds";
import { birthsigns } from "../data/birthsigns";
import { coatColours, coatPatterns } from "../data/coats";
import { physicalDetails } from "../data/physical-details";
import { mouseNames, mouseLastNames } from "../data/names";
import { weapons, armour, ammunition, gear } from "../data/items";
import { spellTemplates } from "../data/spells";

type ItemTemplate = Omit<Item, "equipped">;

/** All known item templates by name for quick lookup */
const itemLookup = new Map<string, ItemTemplate>();

for (const list of [weapons, armour, ammunition, gear]) {
	for (const item of list) {
		itemLookup.set(item.name.toLowerCase(), item);
	}
}

/**
 * Resolve a background item name to a proper Item.
 * Handles "Spell: Name" format, known weapons/armour/gear, and fallback to generic gear.
 */
function resolveItem(name: string): Item {
	// Spell items: "Spell: Name"
	if (name.startsWith("Spell: ")) {
		const spellName = name.slice("Spell: ".length);
		const template = spellTemplates.find(s => s.name === spellName);
		return {
			name: spellName,
			type: "spell",
			slots: 1,
			width: 1,
			height: 1,
			usage: { total: 3, used: 0 },
			description: template?.description,
			equipped: false,
		};
	}

	// Hireling items: keep as gear
	if (name.startsWith("Hireling: ")) {
		return {
			name,
			type: "gear",
			slots: 1,
			width: 1,
			height: 1,
			description: "Hireling",
			equipped: false,
		};
	}

	// Look up in known items
	const known = itemLookup.get(name.toLowerCase());
	if (known) {
		return {
			...known,
			usage: known.usage ? { ...known.usage } : undefined,
			equipped: false,
		};
	}

	// Fallback: generic 1x1 gear
	return {
		name,
		type: "gear",
		slots: 1,
		width: 1,
		height: 1,
		equipped: false,
	};
}

export function generateCharacter(): Character {
	const hpRoll = d6();
	const pipsRoll = d6();
	const bgEntry = backgrounds[hpRoll - 1][pipsRoll - 1];
	const [bgName, item1Name, item2Name] = bgEntry;

	const str = roll3d6kh2();
	const dex = roll3d6kh2();
	const wil = roll3d6kh2();

	const birthsignRoll = d6();
	const birthsign = birthsigns[birthsignRoll - 1];

	const colourRoll = d6();
	const patternRoll = d6();
	const coat = `${coatPatterns[patternRoll - 1]} ${coatColours[colourRoll - 1]}`;

	const detailRoll = (d6() - 1) * 6 + (d6() - 1);
	const detail = physicalDetails[detailRoll] || physicalDetails[0];

	const firstName = mouseNames[Math.floor(Math.random() * mouseNames.length)];
	const lastName = mouseLastNames[Math.floor(Math.random() * mouseLastNames.length)];
	const name = `${firstName} ${lastName}`;

	const pawGrid: GridItem[] = [];
	const bodyGrid: GridItem[] = [];
	const packGrid: GridItem[] = [];

	// Resolve and place starting items in inventory
	const startingItems = [item1Name, item2Name].filter(Boolean).map(resolveItem);

	for (const item of startingItems) {
		// Try paws first for 1x1 items, then body, then pack
		if (item.width === 1 && item.height === 1) {
			if (placeOnGrid(pawGrid, item, PAW_ROWS, PAW_COLS)) continue;
			if (placeOnGrid(bodyGrid, item, BODY_ROWS, BODY_COLS)) continue;
		}
		// Larger items or overflow go to pack
		if (!placeOnGrid(packGrid, item, PACK_ROWS, PACK_COLS)) {
			if (!placeOnGrid(bodyGrid, item, BODY_ROWS, BODY_COLS)) {
				// Last resort — shouldn't happen with only 2 items
			}
		}
	}

	return {
		name,
		level: 1,
		xp: 0,
		hp: { current: hpRoll, max: hpRoll },
		str: { current: str.total, max: str.total },
		dex: { current: dex.total, max: dex.total },
		wil: { current: wil.total, max: wil.total },
		pips: pipsRoll,
		background: bgName,
		birthsign: birthsign.name,
		coat,
		physicalDetail: detail,
		pawGrid,
		bodyGrid,
		packGrid,
		ground: [],
		log: [`${name} the ${bgName} was born under the ${birthsign.name}.`],
	};
}
