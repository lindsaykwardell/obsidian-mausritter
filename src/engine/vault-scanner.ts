import { Plugin } from "obsidian";
import { Character } from "../types/character";
import { HirelingData } from "../types/hireling";
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
	entityType: "character" | "hireling";
}

let cachedSheets: CharacterSheetRef[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 10_000; // 10 seconds

let cachedHirelingSheets: EntitySheetRef[] | null = null;
let hirelingCacheTime = 0;

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

		const data = parseYaml<HirelingData>(blockContent);
		if (data && data.name) {
			results.push({ path: file.path, name: data.name, id: data.id, entityType: "hireling" });
		}
	}

	cachedHirelingSheets = results;
	hirelingCacheTime = now;
	return results;
}

export async function findAllEntitySheets(plugin: Plugin): Promise<EntitySheetRef[]> {
	const [characters, hirelings] = await Promise.all([
		findCharacterSheets(plugin),
		findHirelingSheets(plugin),
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

	return [...charEntities, ...hirelings];
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

	const hireling = parseYaml<HirelingData>(blockContent);
	if (!hireling) return false;

	if (!hireling.ground) hireling.ground = [];
	hireling.ground.push(item);

	const newYaml = serializeYaml(hireling);
	const newText = replaceCodeBlockContent(text, "mausritter-hireling", newYaml);
	await vault.modify(file, newText);

	cachedHirelingSheets = null;
	return true;
}

export async function giveItemToEntity(
	plugin: Plugin,
	ref: EntitySheetRef,
	item: Item
): Promise<boolean> {
	if (ref.entityType === "character") {
		return giveItemToCharacter(plugin, ref.path, item);
	} else {
		return giveItemToHireling(plugin, ref.path, item);
	}
}
