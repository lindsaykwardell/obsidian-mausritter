import { Plugin, TFile } from "obsidian";
import { HomebrewData } from "../types/homebrew";
import { parseYaml, extractCodeBlockContent } from "../utils/yaml-codec";

const BLOCK_TYPE = "mausritter-data";

export class HomebrewRegistry {
	private cache: HomebrewData = {};
	private lastScan = 0;
	private scanInterval = 5000; // re-scan at most every 5 seconds

	constructor(private plugin: Plugin) {}

	/** Get merged homebrew data, rescanning if stale */
	async getData(): Promise<HomebrewData> {
		const now = Date.now();
		if (now - this.lastScan > this.scanInterval) {
			await this.scan();
			this.lastScan = now;
		}
		return this.cache;
	}

	/** Scan all markdown files in the vault for mausritter-data blocks */
	private async scan(): Promise<void> {
		const merged: HomebrewData = {};
		const files = this.plugin.app.vault.getMarkdownFiles();

		for (const file of files) {
			const content = await this.plugin.app.vault.cachedRead(file);
			if (!content.includes("```" + BLOCK_TYPE)) continue;

			const blockContent = extractCodeBlockContent(content, BLOCK_TYPE);
			if (!blockContent) continue;

			const data = parseYaml<HomebrewData>(blockContent);
			if (!data) continue;

			this.mergeInto(merged, data);
		}

		this.cache = merged;
	}

	private mergeInto(target: HomebrewData, source: HomebrewData): void {
		if (source.creatures) {
			target.creatures = (target.creatures ?? []).concat(source.creatures);
		}
		if (source.items) {
			target.items = (target.items ?? []).concat(source.items);
		}
		if (source.npcs) {
			target.npcs = (target.npcs ?? []).concat(source.npcs);
		}
		if (source.names) {
			target.names = (target.names ?? []).concat(source.names);
		}
		if (source["adventure-seeds"]) {
			target["adventure-seeds"] = (target["adventure-seeds"] ?? []).concat(source["adventure-seeds"]);
		}
		if (source["settlement-details"]) {
			target["settlement-details"] = (target["settlement-details"] ?? []).concat(source["settlement-details"]);
		}
		if (source["notable-features"]) {
			target["notable-features"] = (target["notable-features"] ?? []).concat(source["notable-features"]);
		}
		if (source.industries) {
			target.industries = (target.industries ?? []).concat(source.industries);
		}
		if (source.events) {
			target.events = (target.events ?? []).concat(source.events);
		}
		if (source["spark-actions"]) {
			target["spark-actions"] = (target["spark-actions"] ?? []).concat(source["spark-actions"]);
		}
		if (source["spark-subjects"]) {
			target["spark-subjects"] = (target["spark-subjects"] ?? []).concat(source["spark-subjects"]);
		}
		if (source.weather) {
			target.weather = target.weather ?? {};
			for (const [season, entries] of Object.entries(source.weather)) {
				target.weather[season] = (target.weather[season] ?? []).concat(entries);
			}
		}
		if (source.landmarks) {
			target.landmarks = target.landmarks ?? {};
			for (const [terrain, entries] of Object.entries(source.landmarks)) {
				target.landmarks[terrain] = (target.landmarks[terrain] ?? []).concat(entries);
			}
		}
	}

	/** Force a rescan on next access */
	invalidate(): void {
		this.lastScan = 0;
	}
}
