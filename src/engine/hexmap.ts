import { HexMap, HexTerrain, MapHex, MapSettlement, NpcSummary } from "../types/generator";
import { Character, Item, GridItem } from "../types/character";
import { d6, roll } from "./dice";
import {
	placeOnGrid,
	PAW_ROWS, PAW_COLS, BODY_ROWS, BODY_COLS,
	HIRELING_PACK_ROWS, HIRELING_PACK_COLS,
} from "./inventory";
import {
	settlementDetails, notableFeatures, industries, events,
	tavernFirstNames, tavernSecondNames, tavernSpecialties,
	getGovernance, sizeDescription
} from "../data/settlements";
import { landmarks, landmarkDetails } from "../data/landmarks";
import { mouseNames, mouseLastNames, settlementStartNames, settlementEndNames } from "../data/names";
import { weapons, armour, gear } from "../data/items";
import { spellTemplates } from "../data/spells";

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

const birthsignTable: { sign: string; disposition: string }[] = [
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

/** Spell items derived from spell templates */
const spellItems: Omit<Item, "equipped">[] = spellTemplates.map(s => ({
	name: s.name,
	type: "spell" as const,
	slots: 1,
	width: 1,
	height: 1,
	usage: { total: 3, used: 0 },
	description: s.description,
}));

/** All item templates indexed by name for quick lookup */
const allItemTemplates = [
	...weapons,
	...armour,
	...gear.filter(g => g.name !== "Cart"),
	...spellItems,
];

const allItemNames = allItemTemplates.map(t => t.name);

/** Look up an item name in the weapon/armour/gear data and return a proper Item object */
function resolveItemName(name: string): Item {
	const template = allItemTemplates.find(t => t.name === name);
	if (template) {
		const item: Item = { ...template, equipped: false };
		if (template.usage) item.usage = { ...template.usage };
		return item;
	}
	// Unrecognized name becomes custom gear
	return { name, type: "gear", slots: 1, width: 1, height: 1 };
}

/** Generate a full Character for an NPC with personality and inventory */
export function generateNPC(hexId: number = -1): Character {
	const birthsign = birthsignTable[d6() - 1];
	const hpVal = d6();
	const strVal = roll2d6();
	const dexVal = roll2d6();
	const wilVal = roll2d6();
	const firstName = pick(mouseNames);
	const lastName = pick(mouseLastNames);
	const name = `${firstName} ${lastName}`;

	// Generate 0-2 items and place in appropriate slots
	const itemCount = Math.floor(Math.random() * 3);
	const pawGrid: GridItem[] = [];
	const bodyGrid: GridItem[] = [];
	const packGrid: GridItem[] = [];
	const ground: Item[] = [];

	for (let i = 0; i < itemCount; i++) {
		const item = resolveItemName(pick(allItemNames));
		if (item.type === "weapon") {
			if (!placeOnGrid(pawGrid, item, PAW_ROWS, PAW_COLS)) {
				ground.push(item);
			}
		} else if (item.type === "armour") {
			if (!placeOnGrid(bodyGrid, item, BODY_ROWS, BODY_COLS)) {
				ground.push(item);
			}
		} else {
			if (!placeOnGrid(packGrid, item, HIRELING_PACK_ROWS, HIRELING_PACK_COLS)) {
				ground.push(item);
			}
		}
	}

	// Social position determines starting pips
	const socialPosition = socialPositions[d6() - 1];
	const pipsBySocialPosition: Record<string, () => number> = {
		"Poor": () => d6(),
		"Common": () => d6() + d6(),
		"Burghermouse": () => d6() + d6() + d6(),
		"Guildmouse": () => d6() * 10,
		"Noblemouse": () => d6() * 50,
	};
	const pips = (pipsBySocialPosition[socialPosition] ?? (() => d6()))();

	return {
		id: crypto.randomUUID(),
		characterType: "npc",
		name,
		species: "Mouse",
		level: 1,
		xp: 0,
		pips,
		hp: { current: hpVal, max: hpVal },
		str: { current: strVal, max: strVal },
		dex: { current: dexVal, max: dexVal },
		wil: { current: wilVal, max: wilVal },
		pawGrid,
		bodyGrid,
		packGrid,
		ground,
		log: [`Created ${name} — HP ${hpVal}, STR ${strVal}, DEX ${dexVal}, WIL ${wilVal}, ${pips} pips`],
		hexId,
		lastName,
		socialPosition,
		birthsign: birthsign.sign,
		disposition: birthsign.disposition,
		appearance: appearances[d20()],
		quirk: quirks[d20()],
		want: npcWants[d20()],
		relationship: relationships[d20()],
	};
}

/** Generate an NpcSummary for the generator renderer's ephemeral display */
export function generateNpcSummary(hexId: number = -1): NpcSummary {
	const birthsign = birthsignTable[d6() - 1];
	const itemCount = Math.floor(Math.random() * 3);
	const items: string[] = [];
	for (let i = 0; i < itemCount; i++) {
		items.push(pick(allItemNames));
	}

	const socialPosition = socialPositions[d6() - 1];

	// SRD payment for service table
	const paymentTable: Record<string, string> = {
		"Poor": "d6p",
		"Common": "d6 x 10p",
		"Burghermouse": "d6 x 50p",
		"Guildmouse": "d4 x 100p",
		"Noblemouse": "d4 x 1000p",
	};

	return {
		name: pick(mouseNames),
		lastName: pick(mouseLastNames),
		socialPosition,
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
		paymentForService: paymentTable[socialPosition] ?? "d6p",
	};
}

/**
 * Migrate old-format NPCs (number stats, string items) to full Character objects.
 * Returns true if any migration occurred.
 */
export function migrateHexMapNpcs(hexMap: HexMap): boolean {
	let migrated = false;

	function migrateNpcArray(npcs: any[]): Character[] {
		const result: Character[] = [];
		for (const npc of npcs) {
			if (typeof npc.hp === "number") {
				// Old format — convert to Character
				migrated = true;
				const ground: Item[] = [];
				if (Array.isArray(npc.items)) {
					for (const itemName of npc.items) {
						if (typeof itemName === "string") {
							ground.push(resolveItemName(itemName));
						}
					}
				}
				result.push({
					id: npc.id ?? crypto.randomUUID(),
					characterType: "npc",
					name: npc.name ? `${npc.name}${npc.lastName ? ` ${npc.lastName}` : ""}` : "Unknown",
					species: npc.species ?? "Mouse",
					level: npc.level ?? 1,
					xp: npc.xp ?? 0,
					hp: { current: npc.hp, max: npc.hp },
					str: { current: npc.str ?? 10, max: npc.str ?? 10 },
					dex: { current: npc.dex ?? 10, max: npc.dex ?? 10 },
					wil: { current: npc.wil ?? 10, max: npc.wil ?? 10 },
					pawGrid: npc.pawGrid ?? [],
					bodyGrid: npc.bodyGrid ?? [],
					packGrid: npc.packGrid ?? [],
					ground,
					log: npc.log ?? [],
					hexId: npc.hexId,
					lastName: npc.lastName,
					socialPosition: npc.socialPosition,
					birthsign: npc.birthsign,
					disposition: npc.disposition,
					appearance: npc.appearance,
					quirk: npc.quirk,
					want: npc.want,
					relationship: npc.relationship,
				});
			} else {
				// Already Character format — ensure id exists
				if (!npc.id) {
					npc.id = crypto.randomUUID();
					migrated = true;
				}
				if (!npc.characterType) {
					npc.characterType = "npc";
					migrated = true;
				}
				result.push(npc as Character);
			}
		}
		return result;
	}

	for (const hex of hexMap.hexes) {
		if (hex.npcs?.length) {
			hex.npcs = migrateNpcArray(hex.npcs);
		}
		if (hex.settlement?.npcs?.length) {
			hex.settlement.npcs = migrateNpcArray(hex.settlement.npcs);
		}
	}

	return migrated;
}

export function generateMapSettlement(): MapSettlement {
	const roll1 = d6(), roll2 = d6();
	const size = Math.min(roll1, roll2);
	const name = pick(settlementStartNames) + pick(settlementEndNames);

	const npcCount = size >= 4 ? 2 : 1;
	const npcs: Character[] = [];
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
