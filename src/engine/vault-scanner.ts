import { Plugin } from "obsidian";
import { Character } from "../types/character";
import { parseYaml, extractCodeBlockContent, replaceCodeBlockContent } from "../utils/yaml-codec";
import { Item } from "../types/character";

export interface CharacterSheetRef {
	path: string;
	name: string;
}

let cachedSheets: CharacterSheetRef[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 10_000; // 10 seconds

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

	const { serializeYaml } = await import("../utils/yaml-codec");
	const newYaml = serializeYaml(character);
	const newText = replaceCodeBlockContent(text, "mausritter-character", newYaml);
	await vault.modify(file, newText);

	// Invalidate cache
	cachedSheets = null;
	return true;
}
