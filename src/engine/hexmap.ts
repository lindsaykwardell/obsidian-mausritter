import { HexMap, HexTerrain, MapHex, MapSettlement, NPC } from "../types/generator";
import { d6, roll } from "./dice";
import {
	settlementDetails, notableFeatures, industries, events,
	tavernFirstNames, tavernSecondNames, tavernSpecialties,
	getGovernance, sizeDescription
} from "../data/settlements";
import { landmarks, landmarkDetails } from "../data/landmarks";
import { mouseNames, mouseLastNames, settlementStartNames, settlementEndNames } from "../data/names";
import { weapons, armour, gear } from "../data/items";

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}

function d20(): number {
	return Math.floor(Math.random() * 20);
}

function roll2d6(): number {
	return d6() + d6();
}

// SRD Non-player mice tables
const socialPositions = ["Poor", "Common", "Common", "Burghermouse", "Guildmouse", "Noblemouse"];

const birthsigns: { sign: string; disposition: string }[] = [
	{ sign: "Star", disposition: "Brave / Reckless" },
	{ sign: "Wheel", disposition: "Industrious / Unimaginative" },
	{ sign: "Acorn", disposition: "Inquisitive / Stubborn" },
	{ sign: "Storm", disposition: "Generous / Wrathful" },
	{ sign: "Moon", disposition: "Wise / Mysterious" },
	{ sign: "Mother", disposition: "Nurturing / Worrying" },
];

const appearances = [
	"Soulful eyes", "Bright, patched clothes", "Wreath of daisies", "Grubby clothes",
	"Large floppy hat", "Pockets full of seed", "Bent twig walking stick", "Carries rusted pinsword",
	"Long, wild fur", "Very, very old", "Bandaged tail", "Tail tied with a bow",
	"Missing an ear", "Long whiskers", "Twinkling eyes", "Huge, heavy black cloak",
	"Old battle scars", "Very young", "Shaved fur", "Braided fur",
];

const quirks = [
	"Constantly grooming", "Obsessed with weather", "Very high energy", "Traveled, knowledgeable",
	"Cursed by a wizard", "Scares easily", "Ashamed of past crimes", "Very competitive",
	"Flamboyant drunkard", "Extremely polite", "Unreservedly honest", "Slow, careful speech",
	"Quick, erratic speech", "Secret servant of a cat", "Raised by rats", "Outcast from home",
	"Many pet insects", "Hates being outdoors", "Local hero", "Very twitchy whiskers",
];

const npcWants = [
	"Freedom", "Safety", "Escape", "Excitement", "Power", "Meaning", "Health", "Wealth",
	"Protection", "Love", "To protect", "Food", "Friendship", "Rest", "Knowledge", "Savagery",
	"Beauty", "Revenge", "To serve", "Fun",
];

const relationships = [
	"Parent", "Sibling", "Cousin", "Second cousin", "Grandparent", "Related, but don't know it",
	"Married", "Former lovers", "In love, unrequited", "Drinking buddies", "Debt owed",
	"Long and tumultuous", "Sworn enemies", "Guild brothers", "Childhood friends",
	"One stole from the other", "Worked together", "Grew up together", "Serve the same lord",
	"Never met before",
];

const allItems = [
	...weapons.map(w => w.name),
	...armour.map(a => a.name),
	...gear.filter(g => g.name !== "Cart").map(g => g.name),
];

export function generateNPC(hexId: number = -1): NPC {
	const birthsign = birthsigns[d6() - 1];
	const itemCount = Math.floor(Math.random() * 3); // 0-2 items
	const items: string[] = [];
	for (let i = 0; i < itemCount; i++) {
		items.push(pick(allItems));
	}

	return {
		name: pick(mouseNames),
		lastName: pick(mouseLastNames),
		socialPosition: socialPositions[d6() - 1],
		birthsign: birthsign.sign,
		disposition: birthsign.disposition,
		appearance: appearances[d20()],
		quirk: quirks[d20()],
		want: npcWants[d20()],
		relationship: relationships[d20()],
		hp: d6(),
		str: roll2d6(),
		dex: roll2d6(),
		wil: roll2d6(),
		items,
		hexId,
	};
}

export function generateMapSettlement(): MapSettlement {
	const roll1 = d6(), roll2 = d6();
	const size = Math.min(roll1, roll2);
	const name = pick(settlementStartNames) + pick(settlementEndNames);

	const npcCount = size >= 4 ? 2 : 1;
	const npcs: NPC[] = [];
	for (let i = 0; i < npcCount; i++) {
		npcs.push(generateNPC(-1));
	}

	const tavernCount = Math.max(1, Math.floor(size / 2));
	const taverns: { name: string; specialty: string }[] = [];
	for (let i = 0; i < tavernCount; i++) {
		taverns.push({
			name: `The ${pick(tavernFirstNames)} ${pick(tavernSecondNames)}`,
			specialty: pick(tavernSpecialties),
		});
	}

	return {
		name,
		size,
		sizeLabel: sizeDescription(size),
		governance: getGovernance(size, d6()),
		detail: pick(settlementDetails),
		features: [pick(notableFeatures)],
		industries: [pick(industries)],
		event: pick(events),
		taverns,
		npcs,
	};
}

function generateMapHex(id: number, forceSettlement?: boolean): MapHex {
	const terrainRoll = d6();
	let terrain: HexTerrain;
	if (terrainRoll <= 2) terrain = "countryside";
	else if (terrainRoll <= 4) terrain = "forest";
	else if (terrainRoll === 5) terrain = "river";
	else terrain = "human town";

	const builtinLandmarks = landmarks[terrain] ?? landmarks.countryside;
	const landmark = pick(builtinLandmarks);

	const detailOuter = Math.floor(Math.random() * 6);
	let description = "";
	if (detailOuter > 0 && landmarkDetails[detailOuter]) {
		const inner = Math.floor(Math.random() * landmarkDetails[detailOuter].length);
		description = landmarkDetails[detailOuter][inner] ?? "";
	}

	// Settlement: forced or ~20% chance
	const hasSettlement = forceSettlement || (detailOuter === 0);
	const settlement = hasSettlement ? generateMapSettlement() : null;
	const name = settlement ? settlement.name : landmark;

	return {
		id,
		name,
		terrain,
		landmark,
		description,
		settlement,
		npcs: [],
	};
}

export function generateHexMap(name?: string): HexMap {
	const hexes: MapHex[] = [];

	for (let i = 0; i < 19; i++) {
		hexes.push(generateMapHex(i, i === 0));
	}

	return {
		name: name ?? pick(settlementStartNames) + " Region",
		hexes,
		selectedHex: -1,
		partyHex: -1,
	};
}
