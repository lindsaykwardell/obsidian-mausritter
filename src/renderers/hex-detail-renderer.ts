import { MarkdownPostProcessorContext, MarkdownView, Plugin } from "obsidian";
import { HexMap, MapHex } from "../types/generator";
import { parseYaml, serializeYaml, extractCodeBlockContent, updateCodeBlock } from "../utils/yaml-codec";
import { HexMapRenderer } from "./hexmap-renderer";
import { div, button, span, el } from "../utils/dom-helpers";

interface HexRefConfig {
	source?: string;
	hex?: number | string;
}

export class HexDetailRenderer {
	private plugin: Plugin;
	private hexMapRenderer: HexMapRenderer;

	constructor(plugin: Plugin, hexMapRenderer: HexMapRenderer) {
		this.plugin = plugin;
		this.hexMapRenderer = hexMapRenderer;
	}

	async process(
		source: string,
		el: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		const container = el.createDiv({ cls: "mausritter-block mausritter-hex-detail" });

		const config = parseYaml<HexRefConfig>(source) ?? {};

		// If source or hex is missing, show setup inputs
		if (!config.source || config.hex === undefined) {
			this.renderSetup(container, el, ctx, config);
			return;
		}

		const vault = this.plugin.app.vault;
		const sourcePath = config.source;

		// Resolve the source file
		let file = vault.getFileByPath(sourcePath);
		if (!file && !sourcePath.endsWith(".md")) {
			file = vault.getFileByPath(sourcePath + ".md");
		}
		if (!file) {
			const currentFile = this.plugin.app.workspace.getActiveFile();
			if (currentFile) {
				const resolved = this.plugin.app.metadataCache.getFirstLinkpathDest(
					sourcePath.replace(/\.md$/, ""),
					currentFile.path
				);
				if (resolved) file = resolved;
			}
		}

		if (!file) {
			container.createDiv({
				cls: "mausritter-error",
				text: `Source file not found: ${sourcePath}`,
			});
			return;
		}

		// Read the hex map data from the source file
		const fileText = await vault.read(file);
		const blockContent = extractCodeBlockContent(fileText, "mausritter-hexmap");

		if (blockContent === null) {
			container.createDiv({
				cls: "mausritter-error",
				text: `No \`\`\`mausritter-hexmap\`\`\` block found in ${sourcePath}`,
			});
			return;
		}

		const hexMap = parseYaml<HexMap>(blockContent);
		if (!hexMap || !hexMap.hexes?.length) {
			container.createDiv({
				cls: "mausritter-error",
				text: "Hex map data is empty or invalid.",
			});
			return;
		}

		// Find the hex by index or name
		let hex: MapHex | undefined;
		if (typeof config.hex === "number") {
			hex = hexMap.hexes[config.hex];
		} else {
			const searchName = String(config.hex).toLowerCase();
			hex = hexMap.hexes.find(h =>
				h.name.toLowerCase() === searchName ||
				(h.settlement && h.settlement.name.toLowerCase() === searchName)
			);
		}

		if (!hex) {
			container.createDiv({
				cls: "mausritter-error",
				text: `Hex "${config.hex}" not found in ${sourcePath}`,
			});
			return;
		}

		// Source indicator
		const sourceIndicator = container.createDiv({ cls: "mausritter-source-indicator" });
		sourceIndicator.createSpan({ cls: "mausritter-source-icon", text: "\u{1F517}" });
		sourceIndicator.createSpan({
			cls: "mausritter-source-path",
			text: `${sourcePath} \u2192 Hex ${hex.id}`,
		});
		sourceIndicator.addEventListener("click", () => {
			this.plugin.app.workspace.openLinkText(sourcePath, "");
		});

		// Render hex details using the shared method
		const detailPanel = div("mausritter-hexmap-detail");
		this.hexMapRenderer.renderHexDetail(detailPanel, hex);
		container.appendChild(detailPanel);
	}

	private renderSetup(
		container: HTMLElement,
		blockEl: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		config: HexRefConfig
	): void {
		container.appendChild(div("mausritter-title", ["Hex Reference"]));

		const form = div("mausritter-hex-setup");

		// Source input
		const sourceRow = div("mausritter-hexmap-edit-row");
		sourceRow.appendChild(span("mausritter-label", "Source file: "));
		const sourceInput = el("input", {
			class: "mausritter-hexmap-edit-input",
			type: "text",
			value: config.source ?? "",
			placeholder: "Path to file with hexmap block",
		}) as HTMLInputElement;
		sourceRow.appendChild(sourceInput);
		form.appendChild(sourceRow);

		// Hex input
		const hexRow = div("mausritter-hexmap-edit-row");
		hexRow.appendChild(span("mausritter-label", "Hex (# or name): "));
		const hexInput = el("input", {
			class: "mausritter-hexmap-edit-input",
			type: "text",
			value: config.hex !== undefined ? String(config.hex) : "",
			placeholder: '0 or "Settlement Name"',
		}) as HTMLInputElement;
		hexRow.appendChild(hexInput);
		form.appendChild(hexRow);

		// Save button
		form.appendChild(
			button("Save", () => {
				const newConfig: HexRefConfig = {};
				if (sourceInput.value.trim()) {
					newConfig.source = sourceInput.value.trim();
				}
				const hexVal = hexInput.value.trim();
				if (hexVal) {
					const num = parseInt(hexVal, 10);
					newConfig.hex = isNaN(num) ? hexVal : num;
				}
				this.persistConfig(blockEl, ctx, newConfig);
			}, "mausritter-btn mausritter-btn-primary")
		);

		container.appendChild(form);
	}

	private persistConfig(
		blockEl: HTMLElement,
		ctx: MarkdownPostProcessorContext,
		config: HexRefConfig
	): void {
		const view = this.plugin.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return;
		const sectionInfo = ctx.getSectionInfo(blockEl);
		if (!sectionInfo) return;
		const yaml = serializeYaml(config);
		updateCodeBlock(view, sectionInfo, yaml);
	}
}
