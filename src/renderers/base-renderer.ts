import { MarkdownPostProcessorContext, MarkdownView, Plugin, TFile } from "obsidian";
import {
	parseYaml, serializeYaml, updateCodeBlock,
	getSourceReference, extractCodeBlockContent, replaceCodeBlockContent
} from "../utils/yaml-codec";

export abstract class BaseRenderer<T> {
	/** Override in subclasses to specify the code block type name (e.g. "mausritter-character") */
	protected blockType: string = "";
	/** Override to look for a different block type in source files (e.g. combat card reads from character blocks) */
	protected sourceBlockType: string = "";
	/** The file path of the note currently being rendered */
	protected currentFilePath: string = "";

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

		// Resolve the path — try as-is, then with .md extension
		let file = vault.getFileByPath(sourcePath);
		if (!file && !sourcePath.endsWith(".md")) {
			file = vault.getFileByPath(sourcePath + ".md");
		}
		// Also try resolving relative to the current file
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

		// Read the source file and extract the code block
		const fileText = await vault.read(file);
		const remoteType = this.sourceBlockType || this.blockType;
		const blockContent = extractCodeBlockContent(fileText, remoteType);

		if (blockContent === null) {
			container.createDiv({
				cls: "mausritter-error",
				text: `No \`\`\`${remoteType}\`\`\` block found in ${sourcePath}`,
			});
			return;
		}

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
		const remoteType = this.sourceBlockType || this.blockType;
		const newYaml = serializeYaml(data);
		this.plugin.app.vault.process(file, (fileText) => {
			return replaceCodeBlockContent(fileText, remoteType, newYaml);
		});
	}
}
