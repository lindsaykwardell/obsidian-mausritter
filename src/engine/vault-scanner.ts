import { Plugin } from "obsidian";
import { Character } from "../types/character";
import { HexMap } from "../types/generator";
import { parseYaml, extractCodeBlockContent, replaceCodeBlockContent, serializeYaml } from "../utils/yaml-codec";
import { Item } from "../types/character";

export interface CharacterSheetRef {
	path: string;
	name: string;
}

export interface EntitySheetRef {
	path: string;
	name: string;
	id?: string;
	entityType: "character" | "hireling" | "npc";
	hexId?: number;
}

let cachedSheets: CharacterSheetRef[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 10_000; // 10 seconds

let cachedHirelingSheets: EntitySheetRef[] | null = null;
let hirelingCacheTime = 0;

let cachedNpcSheets: EntitySheetRef[] | null = null;
let npcCacheTime = 0;

export async function findCharacterSheets(plugin: Plugin): Promise<CharacterSheetRef[]> {
	const now = Date.now();
	if (cachedSheets && now - cacheTime < CACHE_TTL) {
		return cachedSheets;
	}

	const vault = plugin.app.vault;
	const files = vault.getMarkdownFiles();
	const results: CharacterSheetRef[] = [];

	for (const file of files) {
		const text = await vault.cachedRead(file);
		const blockContent = extractCodeBlockContent(text, "mausritter-character");
		if (blockContent === null) continue;

		const data = parseYaml<Character>(blockContent);
		if (data && data.name) {
			results.push({ path: file.path, name: data.name });
		}
	}

	cachedSheets = results;
	cacheTime = now;
	return results;
}

export async function giveItemToCharacter(
	plugin: Plugin,
	targetPath: string,
	item: Item
): Promise<boolean> {
	const vault = plugin.app.vault;
	const file = vault.getFileByPath(targetPath);
	if (!file) return false;

	const text = await vault.read(file);
	const blockContent = extractCodeBlockContent(text, "mausritter-character");
	if (blockContent === null) return false;

	const character = parseYaml<Character>(blockContent);
	if (!character) return false;

	if (!character.ground) character.ground = [];
	character.ground.push(item);

	const newYaml = serializeYaml(character);
	const newText = replaceCodeBlockContent(text, "mausritter-character", newYaml);
	await vault.modify(file, newText);

	// Invalidate cache
	cachedSheets = null;
	return true;
}

export async function findHirelingSheets(plugin: Plugin): Promise<EntitySheetRef[]> {
	const now = Date.now();
	if (cachedHirelingSheets && now - hirelingCacheTime < CACHE_TTL) {
		return cachedHirelingSheets;
	}

	const vault = plugin.app.vault;
	const files = vault.getMarkdownFiles();
	const results: EntitySheetRef[] = [];

	for (const file of files) {
		const text = await vault.cachedRead(file);
		const blockContent = extractCodeBlockContent(text, "mausritter-hireling");
		if (blockContent === null) continue;

		const data = parseYaml<Character>(blockContent);
		if (data && data.name) {
			results.push({ path: file.path, name: data.name, id: data.id, entityType: "hireling" });
		}
	}

	cachedHirelingSheets = results;
	hirelingCacheTime = now;
	return results;
}

/** Scan hexmap blocks to find all NPCs embedded within hex maps */
export async function findNpcSheets(plugin: Plugin): Promise<EntitySheetRef[]> {
	const now = Date.now();
	if (cachedNpcSheets && now - npcCacheTime < CACHE_TTL) {
		return cachedNpcSheets;
	}

	const vault = plugin.app.vault;
	const files = vault.getMarkdownFiles();
	const results: EntitySheetRef[] = [];

	for (const file of files) {
		const text = await vault.cachedRead(file);
		const blockContent = extractCodeBlockContent(text, "mausritter-hexmap");
		if (blockContent === null) continue;

		const hexMap = parseYaml<HexMap>(blockContent);
		if (!hexMap?.hexes) continue;

		for (const hex of hexMap.hexes) {
			// Hex-level NPCs
			if (hex.npcs) {
				for (const npc of hex.npcs) {
					const ch = npc as Character;
					if (ch.name) {
						results.push({
							path: file.path,
							name: ch.name,
							id: ch.id,
							entityType: "npc",
							hexId: hex.id,
						});
					}
				}
			}
			// Settlement NPCs
			if (hex.settlement?.npcs) {
				for (const npc of hex.settlement.npcs) {
					const ch = npc as Character;
					if (ch.name) {
						results.push({
							path: file.path,
							name: ch.name,
							id: ch.id,
							entityType: "npc",
							hexId: hex.id,
						});
					}
				}
			}
		}
	}

	cachedNpcSheets = results;
	npcCacheTime = now;
	return results;
}

export async function findPartyHex(plugin: Plugin): Promise<number> {
	const vault = plugin.app.vault;
	const files = vault.getMarkdownFiles();

	for (const file of files) {
		const text = await vault.cachedRead(file);
		const blockContent = extractCodeBlockContent(text, "mausritter-hexmap");
		if (blockContent === null) continue;

		const data = parseYaml<HexMap>(blockContent);
		if (data && data.partyHex != null) {
			return data.partyHex;
		}
	}

	return -1;
}

/** Check whether the party is currently at a hex with a settlement. Returns the settlement name or null. */
export async function findPartySettlement(plugin: Plugin): Promise<{ path: string; hexId: number; settlementName: string } | null> {
	const vault = plugin.app.vault;
	const files = vault.getMarkdownFiles();

	for (const file of files) {
		const text = await vault.cachedRead(file);
		const blockContent = extractCodeBlockContent(text, "mausritter-hexmap");
		if (blockContent === null) continue;

		const data = parseYaml<HexMap>(blockContent);
		if (!data?.hexes || data.partyHex == null || data.partyHex < 0) continue;

		const hex = data.hexes[data.partyHex];
		if (hex?.settlement) {
			return { path: file.path, hexId: data.partyHex, settlementName: hex.settlement.name };
		}
	}

	return null;
}

/** Deposit an item into the settlement bank at the party's current hex */
export async function depositItemInBank(
	plugin: Plugin,
	hexmapPath: string,
	hexId: number,
	item: Item
): Promise<boolean> {
	const vault = plugin.app.vault;
	const file = vault.getFileByPath(hexmapPath);
	if (!file) return false;

	const text = await vault.read(file);
	const blockContent = extractCodeBlockContent(text, "mausritter-hexmap");
	if (blockContent === null) return false;

	const hexMap = parseYaml<HexMap>(blockContent);
	if (!hexMap?.hexes) return false;

	const hex = hexMap.hexes[hexId];
	if (!hex?.settlement) return false;

	if (!hex.settlement.bank) hex.settlement.bank = { pips: 0, items: [] };
	hex.settlement.bank.items.push(item);

	const newYaml = serializeYaml(hexMap);
	const newText = replaceCodeBlockContent(text, "mausritter-hexmap", newYaml);
	await vault.modify(file, newText);

	return true;
}

export async function findAllEntitySheets(plugin: Plugin): Promise<EntitySheetRef[]> {
	const [characters, hirelings, npcs] = await Promise.all([
		findCharacterSheets(plugin),
		findHirelingSheets(plugin),
		findNpcSheets(plugin),
	]);

	const vault = plugin.app.vault;
	const charEntities: EntitySheetRef[] = [];
	for (const c of characters) {
		// Re-read to get the id
		const file = vault.getFileByPath(c.path);
		let id: string | undefined;
		if (file) {
			const text = await vault.cachedRead(file);
			const blockContent = extractCodeBlockContent(text, "mausritter-character");
			if (blockContent) {
				const data = parseYaml<Character>(blockContent);
				id = data?.id;
			}
		}
		charEntities.push({
			path: c.path,
			name: c.name,
			id,
			entityType: "character",
		});
	}

	return [...charEntities, ...hirelings, ...npcs];
}

export async function giveItemToHireling(
	plugin: Plugin,
	targetPath: string,
	item: Item
): Promise<boolean> {
	const vault = plugin.app.vault;
	const file = vault.getFileByPath(targetPath);
	if (!file) return false;

	const text = await vault.read(file);
	const blockContent = extractCodeBlockContent(text, "mausritter-hireling");
	if (blockContent === null) return false;

	const hireling = parseYaml<Character>(blockContent);
	if (!hireling) return false;

	if (!hireling.ground) hireling.ground = [];
	hireling.ground.push(item);

	const newYaml = serializeYaml(hireling);
	const newText = replaceCodeBlockContent(text, "mausritter-hireling", newYaml);
	await vault.modify(file, newText);

	cachedHirelingSheets = null;
	return true;
}

/** Give an item to an NPC embedded within a hexmap block.
 *  Finds the NPC by UUID across all hexes/settlements. */
export async function giveItemToNpc(
	plugin: Plugin,
	targetPath: string,
	item: Item,
	npcId?: string
): Promise<boolean> {
	const vault = plugin.app.vault;
	const file = vault.getFileByPath(targetPath);
	if (!file) return false;

	const text = await vault.read(file);
	const blockContent = extractCodeBlockContent(text, "mausritter-hexmap");
	if (blockContent === null) return false;

	const hexMap = parseYaml<HexMap>(blockContent);
	if (!hexMap?.hexes) return false;

	// Find the NPC by id across all hexes and settlements
	let found = false;
	for (const hex of hexMap.hexes) {
		if (hex.npcs) {
			for (const npc of hex.npcs) {
				const ch = npc as Character;
				if (npcId && ch.id === npcId) {
					if (!ch.ground) ch.ground = [];
					ch.ground.push(item);
					found = true;
					break;
				}
			}
		}
		if (found) break;
		if (hex.settlement?.npcs) {
			for (const npc of hex.settlement.npcs) {
				const ch = npc as Character;
				if (npcId && ch.id === npcId) {
					if (!ch.ground) ch.ground = [];
					ch.ground.push(item);
					found = true;
					break;
				}
			}
		}
		if (found) break;
	}

	if (!found) return false;

	const newYaml = serializeYaml(hexMap);
	const newText = replaceCodeBlockContent(text, "mausritter-hexmap", newYaml);
	await vault.modify(file, newText);

	cachedNpcSheets = null;
	return true;
}

export async function giveItemToEntity(
	plugin: Plugin,
	ref: EntitySheetRef,
	item: Item
): Promise<boolean> {
	if (ref.entityType === "character") {
		return giveItemToCharacter(plugin, ref.path, item);
	} else if (ref.entityType === "npc") {
		return giveItemToNpc(plugin, ref.path, item, ref.id);
	} else {
		return giveItemToHireling(plugin, ref.path, item);
	}
}
