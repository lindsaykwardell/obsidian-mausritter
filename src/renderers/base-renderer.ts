import { MarkdownPostProcessorContext, MarkdownView, Plugin, TFile } from "obsidian";
import {
	parseYaml, serializeYaml, updateCodeBlock,
	getSourceReference, extractCodeBlockContent, replaceCodeBlockContent
} from "../utils/yaml-codec";
import { Character } from "../types/character";
import { HexMap } from "../types/generator";

export abstract class BaseRenderer<T> {
	/** Override in subclasses to specify the code block type name (e.g. "mausritter-character") */
	protected blockType: string = "";
	/** Override to look for a different block type in source files (e.g. combat card reads from character blocks) */
	protected sourceBlockType: string = "";
	/** Override to try multiple block types in order when loading from a source file */
	protected sourceBlockTypes: string[] = [];
	/** The file path of the note currently being rendered */
	protected currentFilePath: string = "";
	/** The block type that was matched when loading from a remote source */
	private matchedSourceBlockType: string = "";
	/** If the source references a hexmap NPC, store the UUID */
	private npcUuid: string = "";

	constructor(protected plugin: Plugin) {}

	async process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		const container = el.createDiv({ cls: "mausritter-block" });
		this.currentFilePath = ctx.sourcePath;

		// Check for cross-file reference
		const sourceRef = getSourceReference(source);

		if (sourceRef) {
			await this.processRemoteSource(container, sourceRef, ctx);
		} else {
			const data = parseYaml<T>(source);
			try {
				this.render(container, data, (newData: T) => {
					this.persistState(el, ctx, newData);
				});
			} catch (e) {
				container.createDiv({ cls: "mausritter-error", text: `Error: ${e}` });
			}
		}
	}

	private async processRemoteSource(
		container: HTMLElement,
		sourcePath: string,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		const vault = this.plugin.app.vault;

		// Check for #npc=<uuid> suffix
		let filePath = sourcePath;
		this.npcUuid = "";
		const npcMatch = sourcePath.match(/^(.+)#npc=([a-f0-9-]+)$/i);
		if (npcMatch) {
			filePath = npcMatch[1];
			this.npcUuid = npcMatch[2];
		}

		// Resolve the path — try as-is, then with .md extension
		let file = vault.getFileByPath(filePath);
		if (!file && !filePath.endsWith(".md")) {
			file = vault.getFileByPath(filePath + ".md");
		}
		// Also try resolving relative to the current file
		if (!file) {
			const currentFile = this.plugin.app.workspace.getActiveFile();
			if (currentFile) {
				const resolved = this.plugin.app.metadataCache.getFirstLinkpathDest(
					filePath.replace(/\.md$/, ""),
					currentFile.path
				);
				if (resolved) file = resolved;
			}
		}

		if (!file) {
			container.createDiv({
				cls: "mausritter-error",
				text: `Source file not found: ${filePath}`,
			});
			return;
		}

		// If this is a hexmap NPC reference, handle specially
		if (this.npcUuid) {
			await this.processHexmapNpc(container, file, sourcePath);
			return;
		}

		// Read the source file and extract the code block
		const fileText = await vault.read(file);

		let blockContent: string | null = null;
		let matchedType = "";

		if (this.sourceBlockTypes.length > 0) {
			for (const bt of this.sourceBlockTypes) {
				blockContent = extractCodeBlockContent(fileText, bt);
				if (blockContent !== null) {
					matchedType = bt;
					break;
				}
			}
		} else {
			matchedType = this.sourceBlockType || this.blockType;
			blockContent = extractCodeBlockContent(fileText, matchedType);
		}

		if (blockContent === null) {
			const triedTypes = this.sourceBlockTypes.length > 0
				? this.sourceBlockTypes.join("`, `")
				: (this.sourceBlockType || this.blockType);
			container.createDiv({
				cls: "mausritter-error",
				text: `No \`\`\`${triedTypes}\`\`\` block found in ${sourcePath}`,
			});
			return;
		}

		this.matchedSourceBlockType = matchedType;

		const data = parseYaml<T>(blockContent);

		// Show a source indicator
		const sourceIndicator = container.createDiv({ cls: "mausritter-source-indicator" });
		sourceIndicator.createSpan({ cls: "mausritter-source-icon", text: "\u{1F517}" });
		sourceIndicator.createSpan({
			cls: "mausritter-source-path",
			text: sourcePath,
		});
		sourceIndicator.addEventListener("click", () => {
			this.plugin.app.workspace.openLinkText(sourcePath, "");
		});

		try {
			this.render(container, data, (newData: T) => {
				this.persistToRemoteFile(file, newData);
			});
		} catch (e) {
			container.createDiv({ cls: "mausritter-error", text: `Error: ${e}` });
		}
	}

	/** Handle a source reference that points to an NPC inside a hexmap */
	private async processHexmapNpc(
		container: HTMLElement,
		file: TFile,
		sourcePath: string
	): Promise<void> {
		const vault = this.plugin.app.vault;
		const fileText = await vault.read(file);
		const blockContent = extractCodeBlockContent(fileText, "mausritter-hexmap");

		if (blockContent === null) {
			container.createDiv({
				cls: "mausritter-error",
				text: `No mausritter-hexmap block found in ${file.path}`,
			});
			return;
		}

		const hexMap = parseYaml<HexMap>(blockContent);
		if (!hexMap?.hexes) {
			container.createDiv({
				cls: "mausritter-error",
				text: `Invalid hexmap data in ${file.path}`,
			});
			return;
		}

		// Find the NPC by UUID across all hexes and settlements
		let npc: Character | null = null;
		for (const hex of hexMap.hexes) {
			if (hex.npcs) {
				for (const n of hex.npcs) {
					if ((n as Character).id === this.npcUuid) {
						npc = n as Character;
						break;
					}
				}
			}
			if (npc) break;
			if (hex.settlement?.npcs) {
				for (const n of hex.settlement.npcs) {
					if ((n as Character).id === this.npcUuid) {
						npc = n as Character;
						break;
					}
				}
			}
			if (npc) break;
		}

		if (!npc) {
			container.createDiv({
				cls: "mausritter-error",
				text: `NPC with id ${this.npcUuid} not found in hexmap`,
			});
			return;
		}

		// Show a source indicator
		const sourceIndicator = container.createDiv({ cls: "mausritter-source-indicator" });
		sourceIndicator.createSpan({ cls: "mausritter-source-icon", text: "\u{1F517}" });
		sourceIndicator.createSpan({
			cls: "mausritter-source-path",
			text: `${file.path} → ${npc.name}`,
		});
		sourceIndicator.addEventListener("click", () => {
			this.plugin.app.workspace.openLinkText(file.path, "");
		});

		const npcUuid = this.npcUuid;

		try {
			this.render(container, npc as unknown as T, (newData: T) => {
				// Persist changes back to the hexmap
				this.persistNpcToHexmap(file, npcUuid, newData as unknown as Character);
			});
		} catch (e) {
			container.createDiv({ cls: "mausritter-error", text: `Error: ${e}` });
		}
	}

	/** Persist an NPC's changes back into the hexmap data */
	private persistNpcToHexmap(file: TFile, npcId: string, npcData: Character): void {
		this.plugin.app.vault.process(file, (fileText) => {
			const blockContent = extractCodeBlockContent(fileText, "mausritter-hexmap");
			if (!blockContent) return fileText;

			const hexMap = parseYaml<HexMap>(blockContent);
			if (!hexMap?.hexes) return fileText;

			// Find and replace the NPC
			for (const hex of hexMap.hexes) {
				if (hex.npcs) {
					for (let i = 0; i < hex.npcs.length; i++) {
						if ((hex.npcs[i] as Character).id === npcId) {
							hex.npcs[i] = npcData as any;
							const newYaml = serializeYaml(hexMap);
							return replaceCodeBlockContent(fileText, "mausritter-hexmap", newYaml);
						}
					}
				}
				if (hex.settlement?.npcs) {
					for (let i = 0; i < hex.settlement.npcs.length; i++) {
						if ((hex.settlement.npcs[i] as Character).id === npcId) {
							hex.settlement.npcs[i] = npcData as any;
							const newYaml = serializeYaml(hexMap);
							return replaceCodeBlockContent(fileText, "mausritter-hexmap", newYaml);
						}
					}
				}
			}

			return fileText;
		});
	}

	protected abstract render(
		container: HTMLElement,
		data: T | null,
		updateState: (data: T) => void
	): void;

	private persistState(
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		data: T
	): void {
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;

		const sectionInfo = ctx.getSectionInfo(el);
		if (!sectionInfo) return;

		const newYaml = serializeYaml(data);
		updateCodeBlock(view, sectionInfo, newYaml);
	}

	private persistToRemoteFile(file: TFile, data: T): void {
		const remoteType = this.matchedSourceBlockType || this.sourceBlockType || this.blockType;
		const newYaml = serializeYaml(data);
		this.plugin.app.vault.process(file, (fileText) => {
			return replaceCodeBlockContent(fileText, remoteType, newYaml);
		});
	}
}
