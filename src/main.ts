import { Plugin, MarkdownView, WorkspaceLeaf } from "obsidian";
import { CharacterRenderer } from "./renderers/character-renderer";
import { DiceRenderer } from "./renderers/dice-renderer";
import { OracleRenderer } from "./renderers/oracle-renderer";
import { GeneratorRenderer } from "./renderers/generator-renderer";
import { CreatureRenderer } from "./renderers/creature-renderer";
import { SpellRenderer } from "./renderers/spell-renderer";
import { DataRenderer } from "./renderers/data-renderer";
import { CombatCardRenderer } from "./renderers/combat-card-renderer";
import { HexMapRenderer } from "./renderers/hexmap-renderer";
import { HexDetailRenderer } from "./renderers/hex-detail-renderer";
import { FactionRenderer } from "./renderers/faction-renderer";
import { AdventureSiteRenderer } from "./renderers/adventure-site-renderer";
import { TreasureRenderer } from "./renderers/treasure-renderer";
import { HirelingRenderer } from "./renderers/hireling-renderer";
import { WarbandRenderer } from "./renderers/warband-renderer";
import { HomebrewRegistry } from "./engine/homebrew";
import { RulebookView, RULEBOOK_VIEW_TYPE } from "./views/rulebook-view";

export default class MausritterPlugin extends Plugin {
	homebrew!: HomebrewRegistry;

	async onload() {
		this.homebrew = new HomebrewRegistry(this);

		const characterRenderer = new CharacterRenderer(this);
		const diceRenderer = new DiceRenderer(this);
		const oracleRenderer = new OracleRenderer(this, this.homebrew);
		const generatorRenderer = new GeneratorRenderer(this, this.homebrew);
		const creatureRenderer = new CreatureRenderer(this, this.homebrew);
		const spellRenderer = new SpellRenderer(this);
		const dataRenderer = new DataRenderer(this);
		const combatCardRenderer = new CombatCardRenderer(this);
		const hexMapRenderer = new HexMapRenderer(this);
		const hexDetailRenderer = new HexDetailRenderer(this, hexMapRenderer);
		const factionRenderer = new FactionRenderer(this);
		const adventureSiteRenderer = new AdventureSiteRenderer(this);
		const treasureRenderer = new TreasureRenderer(this);
		const hirelingRenderer = new HirelingRenderer(this);
		const warbandRenderer = new WarbandRenderer(this);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-character",
			(source, el, ctx) => characterRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-dice",
			(source, el, ctx) => diceRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-oracle",
			(source, el, ctx) => oracleRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-generator",
			(source, el, ctx) => generatorRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-creature",
			(source, el, ctx) => creatureRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-spell",
			(source, el, ctx) => spellRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-data",
			(source, el, ctx) => dataRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-combat-card",
			(source, el, ctx) => combatCardRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-hexmap",
			(source, el, ctx) => hexMapRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-hex",
			(source, el, ctx) => hexDetailRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-faction",
			(source, el, ctx) => factionRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-adventure-site",
			(source, el, ctx) => adventureSiteRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-treasure",
			(source, el, ctx) => treasureRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-hireling",
			(source, el, ctx) => hirelingRenderer.process(source, el, ctx)
		);

		this.registerMarkdownCodeBlockProcessor(
			"mausritter-warband",
			(source, el, ctx) => warbandRenderer.process(source, el, ctx)
		);

		// Register commands to insert code blocks
		const blocks: [string, string][] = [
			["character", "mausritter-character"],
			["dice", "mausritter-dice"],
			["oracle", "mausritter-oracle"],
			["generator", "mausritter-generator"],
			["creature", "mausritter-creature"],
			["spell", "mausritter-spell"],
			["combat card", "mausritter-combat-card"],
			["homebrew data", "mausritter-data"],
			["hexmap", "mausritter-hexmap"],
			["hex reference", "mausritter-hex"],
			["faction", "mausritter-faction"],
			["adventure site", "mausritter-adventure-site"],
			["treasure", "mausritter-treasure"],
			["hireling", "mausritter-hireling"],
			["warband", "mausritter-warband"],
		];

		for (const [label, blockType] of blocks) {
			this.addCommand({
				id: `insert-${blockType}`,
				name: `Insert ${label} block`,
				editorCallback: (editor) => {
					const cursor = editor.getCursor();
					const text = `\n\`\`\`${blockType}\n\n\`\`\`\n`;
					editor.replaceRange(text, cursor);
					// Place cursor inside the block
					editor.setCursor({ line: cursor.line + 2, ch: 0 });
				},
			});
		}

		// Rulebook sidebar
		this.registerView(RULEBOOK_VIEW_TYPE, (leaf) => new RulebookView(leaf));

		this.addCommand({
			id: "open-rulebook",
			name: "Open rulebook",
			callback: () => this.activateRulebookView(),
		});
	}

	private async activateRulebookView(): Promise<void> {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(RULEBOOK_VIEW_TYPE);

		if (leaves.length > 0) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: RULEBOOK_VIEW_TYPE, active: true });
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	onunload() {}
}
