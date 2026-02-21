import { Character } from "../types/character";
import { roll, d6, roll3d6kh2 } from "./dice";
import { placeOnGrid, PAW_ROWS, PAW_COLS } from "./inventory";
import { backgrounds } from "../data/backgrounds";
import { birthsigns } from "../data/birthsigns";
import { coatColours, coatPatterns } from "../data/coats";
import { physicalDetails } from "../data/physical-details";
import { mouseNames, mouseLastNames } from "../data/names";

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

	const pawGrid = [];
	const bodyGrid = [];
	const packGrid = [];

	// Place starting items in paw slots
	const startingItems = [item1Name, item2Name].filter(Boolean);
	for (const itemName of startingItems) {
		placeOnGrid(pawGrid, {
			name: itemName,
			type: "gear",
			slots: 1,
			width: 1,
			height: 1,
		}, PAW_ROWS, PAW_COLS);
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
