import { MarkdownPostProcessorContext, Plugin } from "obsidian";
import { parseYaml } from "../utils/yaml-codec";
import { HomebrewData } from "../types/homebrew";
import { div, span, el } from "../utils/dom-helpers";

/** Renders a mausritter-data block as a read-only summary of custom content */
export class DataRenderer {
	constructor(private plugin: Plugin) {}

	async process(
		source: string,
		container: HTMLElement,
		ctx: MarkdownPostProcessorContext
	): Promise<void> {
		const wrapper = container.createDiv({ cls: "mausritter-block mausritter-data" });
		wrapper.appendChild(div("mausritter-title", ["Homebrew Data"]));

		const data = parseYaml<HomebrewData>(source);
		if (!data) {
			wrapper.appendChild(div("mausritter-data-empty", [
				"Add custom creatures, items, NPCs, names, and more in YAML format.",
			]));
			return;
		}

		const categories: [string, unknown[] | Record<string, unknown[]> | undefined][] = [
			["Creatures", data.creatures],
			["Items", data.items],
			["NPCs", data.npcs],
			["Names", data.names],
			["Adventure Seeds", data["adventure-seeds"]],
			["Settlement Details", data["settlement-details"]],
			["Notable Features", data["notable-features"]],
			["Industries", data.industries],
			["Events", data.events],
			["Spark Actions", data["spark-actions"]],
			["Spark Subjects", data["spark-subjects"]],
			["Weather", data.weather],
			["Landmarks", data.landmarks],
		];

		for (const [label, value] of categories) {
			if (!value) continue;

			const section = div("mausritter-data-section");
			const count = Array.isArray(value)
				? value.length
				: Object.values(value).reduce((sum, arr) => sum + (arr as unknown[]).length, 0);

			section.appendChild(div("mausritter-data-category", [
				span("mausritter-data-category-name", label),
				span("mausritter-data-category-count", `${count} entries`),
			]));

			// Show names/preview for each entry
			if (Array.isArray(value)) {
				const preview = value.slice(0, 5).map((entry: any) => {
					if (typeof entry === "string") return entry;
					return entry.name ?? entry.seed ?? JSON.stringify(entry).slice(0, 60);
				});
				section.appendChild(div("mausritter-data-preview", [
					preview.join(", ") + (value.length > 5 ? `, ... +${value.length - 5} more` : ""),
				]));
			} else {
				// Record type (weather, landmarks)
				for (const [key, entries] of Object.entries(value as Record<string, unknown[]>)) {
					section.appendChild(div("mausritter-data-preview", [
						`${key}: ${(entries as unknown[]).length} entries`,
					]));
				}
			}

			wrapper.appendChild(section);
		}
	}
}
