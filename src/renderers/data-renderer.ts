import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { HomebrewData } from "../types/homebrew";
import { HomebrewRegistry } from "../engine/homebrew";
import { Creature, Attack } from "../types/creature";
import { Item } from "../types/character";
import { div, button, span, el } from "../utils/dom-helpers";

type HomebrewItem = Omit<Item, "equipped">;

export class DataRenderer extends BaseRenderer<HomebrewData> {
	protected blockType = "mausritter-data";
	private homebrew: HomebrewRegistry;
	private editing = false;

	constructor(plugin: Plugin, homebrew: HomebrewRegistry) {
		super(plugin);
		this.homebrew = homebrew;
	}

	protected render(
		container: HTMLElement,
		data: HomebrewData | null,
		updateState: (data: HomebrewData) => void
	): void {
		container.addClass("mausritter-data");

		const persist = (d: HomebrewData) => {
			updateState(d);
			this.homebrew.invalidate();
		};

		if (!data) {
			container.appendChild(div("mausritter-title", ["Homebrew Data"]));
			container.appendChild(div("mausritter-data-empty", [
				"Add custom creatures, items, NPCs, names, and more.",
			]));
			container.appendChild(
				button("Edit", () => {
					this.editing = true;
					container.empty();
					this.render(container, {}, persist);
				}, "mausritter-btn mausritter-btn-primary")
			);
			return;
		}

		if (this.editing) {
			this.renderEdit(container, data, persist);
		} else {
			this.renderRead(container, data, persist);
		}
	}

	// ---- Read view ----

	private renderRead(
		container: HTMLElement,
		data: HomebrewData,
		updateState: (data: HomebrewData) => void
	): void {
		const header = div("mausritter-data-header");
		header.appendChild(el("span", { class: "mausritter-title" }, ["Homebrew Data"]));
		header.appendChild(
			button("Edit", () => {
				this.editing = true;
				container.empty();
				this.render(container, data, updateState);
			}, "mausritter-btn")
		);
		container.appendChild(header);

		const categories: [string, unknown[] | Record<string, unknown[]> | undefined][] = [
			["Creatures", data.creatures],
			["Items", data.items],
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

		let anyData = false;
		for (const [label, value] of categories) {
			if (!value) continue;

			const count = Array.isArray(value)
				? value.length
				: Object.values(value).reduce((sum, arr) => sum + (arr as unknown[]).length, 0);
			if (count === 0) continue;
			anyData = true;

			const section = div("mausritter-data-section");
			section.appendChild(div("mausritter-data-category", [
				span("mausritter-data-category-name", label),
				span("mausritter-data-category-count", `${count} ${count === 1 ? "entry" : "entries"}`),
			]));

			if (Array.isArray(value)) {
				const preview = value.slice(0, 5).map((entry: any) => {
					if (typeof entry === "string") return entry;
					return entry.name ?? JSON.stringify(entry).slice(0, 60);
				});
				section.appendChild(div("mausritter-data-preview", [
					preview.join(", ") + (value.length > 5 ? `, ... +${value.length - 5} more` : ""),
				]));
			} else {
				for (const [key, entries] of Object.entries(value as Record<string, unknown[]>)) {
					section.appendChild(div("mausritter-data-preview", [
						`${key}: ${(entries as unknown[]).length} entries`,
					]));
				}
			}
			container.appendChild(section);
		}

		if (!anyData) {
			container.appendChild(div("mausritter-data-empty", ["No homebrew entries yet."]));
		}
	}

	// ---- Edit view ----

	private renderEdit(
		container: HTMLElement,
		data: HomebrewData,
		updateState: (data: HomebrewData) => void
	): void {
		const header = div("mausritter-data-header");
		header.appendChild(el("span", { class: "mausritter-title" }, ["Homebrew Data"]));
		header.appendChild(
			button("Done", () => {
				this.editing = false;
				// Clean empty arrays/objects before persisting
				const cleaned = this.cleanData(data);
				updateState(cleaned);
			}, "mausritter-btn mausritter-btn-primary")
		);
		container.appendChild(header);

		// Re-render DOM locally without persisting — persistence happens on Done
		const rerender = () => {
			// Snapshot which <details> are open before rebuilding
			const openSet = new Set<string>();
			container.querySelectorAll("details[open]").forEach(d => {
				const key = d.getAttribute("data-section-key");
				if (key) openSet.add(key);
			});
			container.empty();
			this.renderEdit(container, data, updateState);
			// Restore open state
			container.querySelectorAll("details").forEach(d => {
				const key = d.getAttribute("data-section-key");
				if (key && openSet.has(key)) d.setAttribute("open", "");
			});
		};

		// Creatures
		this.renderCreatureSection(container, data, rerender);
		// Items
		this.renderItemSection(container, data, rerender);
		// Simple string lists
		const stringLists: [string, keyof HomebrewData][] = [
			["Names", "names"],
			["Adventure Seeds", "adventure-seeds"],
			["Settlement Details", "settlement-details"],
			["Notable Features", "notable-features"],
			["Industries", "industries"],
			["Events", "events"],
			["Spark Actions", "spark-actions"],
			["Spark Subjects", "spark-subjects"],
		];
		for (const [label, key] of stringLists) {
			this.renderStringListSection(container, label, key, data, rerender);
		}
		// Record categories
		this.renderRecordSection(container, "Weather", "weather",
			["spring", "summer", "autumn", "winter"], data, rerender);
		this.renderRecordSection(container, "Landmarks", "landmarks",
			["countryside", "forest", "river", "human town"], data, rerender);
	}

	// ---- String list sections ----

	private renderStringListSection(
		container: HTMLElement,
		label: string,
		key: keyof HomebrewData,
		data: HomebrewData,
		rerender: () => void
	): void {
		const items = (data[key] as string[] | undefined) ?? [];
		const details = el("details", { class: "mausritter-data-edit-section", "data-section-key": `list-${key}` });
		const summary = el("summary", {}, [
			`${label} (${items.length})`,
		]);
		details.appendChild(summary);

		const content = div("mausritter-data-edit-content");

		// Add row
		const addRow = div("mausritter-data-add-row");
		const input = el("input", { type: "text", placeholder: `New ${label.toLowerCase().replace(/s$/, "")}...`, class: "mausritter-data-input" }) as HTMLInputElement;
		addRow.appendChild(input);
		addRow.appendChild(button("Add", () => {
			if (!input.value.trim()) return;
			if (!data[key]) (data as any)[key] = [];
			(data[key] as string[]).push(input.value.trim());
			rerender();
		}, "mausritter-btn mausritter-btn-small"));
		content.appendChild(addRow);

		// Existing entries
		items.forEach((item, i) => {
			const row = div("mausritter-data-entry-row");
			const entryInput = el("input", { type: "text", class: "mausritter-data-input mausritter-data-input-wide" }) as HTMLInputElement;
			entryInput.value = item;
			entryInput.addEventListener("change", () => {
				(data[key] as string[])[i] = entryInput.value;
				rerender();
			});
			row.appendChild(entryInput);
			row.appendChild(button("X", () => {
				(data[key] as string[]).splice(i, 1);
				rerender();
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger"));
			content.appendChild(row);
		});

		details.appendChild(content);
		container.appendChild(details);
	}

	// ---- Creature section ----

	private renderCreatureSection(
		container: HTMLElement,
		data: HomebrewData,
		rerender: () => void
	): void {
		const creatures = data.creatures ?? [];
		const details = el("details", { class: "mausritter-data-edit-section", "data-section-key": "creatures" });
		details.appendChild(el("summary", {}, [`Creatures (${creatures.length})`]));

		const content = div("mausritter-data-edit-content");

		content.appendChild(button("Add Creature", () => {
			if (!data.creatures) data.creatures = [];
			data.creatures.push({
				name: "New Creature",
				hp: 1, str: 3, dex: 3, wil: 3, armour: 0,
				attacks: [{ name: "Bite", damage: "d6" }],
			});
			rerender();
		}, "mausritter-btn mausritter-btn-small"));

		creatures.forEach((creature, ci) => {
			content.appendChild(this.renderCreatureCard(creature, ci, data, rerender));
		});

		details.appendChild(content);
		container.appendChild(details);
	}

	private renderCreatureCard(
		creature: Creature,
		index: number,
		data: HomebrewData,
		rerender: () => void
	): HTMLElement {
		const card = div("mausritter-data-card");

		const cardDetails = el("details", { "data-section-key": `creature-${index}` });
		const cardSummary = el("summary", { class: "mausritter-data-card-summary" }, [
			`${creature.name} — HP ${creature.hp}, STR ${creature.str}, DEX ${creature.dex}, WIL ${creature.wil}`,
		]);
		cardDetails.appendChild(cardSummary);

		const form = div("mausritter-data-card-form");

		// Name
		form.appendChild(this.labeledInput("Name", creature.name, v => { creature.name = v; rerender(); }));

		// Stats row
		const statsRow = div("mausritter-data-stats-row");
		for (const stat of [["HP", "hp"], ["STR", "str"], ["DEX", "dex"], ["WIL", "wil"], ["Armour", "armour"]] as const) {
			statsRow.appendChild(this.labeledNumber(stat[0], (creature as any)[stat[1]], v => {
				(creature as any)[stat[1]] = v;
				rerender();
			}));
		}
		form.appendChild(statsRow);

		// Attacks
		form.appendChild(el("div", { class: "mausritter-data-field-label" }, ["Attacks"]));
		creature.attacks.forEach((attack, ai) => {
			const attackRow = div("mausritter-data-attack-row");
			const nameIn = el("input", { type: "text", placeholder: "Name", class: "mausritter-data-input" }) as HTMLInputElement;
			nameIn.value = attack.name;
			nameIn.addEventListener("change", () => { attack.name = nameIn.value; rerender(); });
			attackRow.appendChild(nameIn);

			const dmgIn = el("input", { type: "text", placeholder: "Damage (d6)", class: "mausritter-data-input mausritter-data-input-short" }) as HTMLInputElement;
			dmgIn.value = attack.damage;
			dmgIn.addEventListener("change", () => { attack.damage = dmgIn.value; rerender(); });
			attackRow.appendChild(dmgIn);

			const tgtIn = el("input", { type: "text", placeholder: "Target (opt)", class: "mausritter-data-input mausritter-data-input-short" }) as HTMLInputElement;
			tgtIn.value = attack.target ?? "";
			tgtIn.addEventListener("change", () => { attack.target = tgtIn.value || undefined; rerender(); });
			attackRow.appendChild(tgtIn);

			attackRow.appendChild(button("X", () => {
				creature.attacks.splice(ai, 1);
				rerender();
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger"));
			form.appendChild(attackRow);
		});
		form.appendChild(button("+ Attack", () => {
			creature.attacks.push({ name: "", damage: "d6" });
			rerender();
		}, "mausritter-btn mausritter-btn-small"));

		// Optional text fields
		form.appendChild(this.labeledInput("Critical Damage", creature.criticalDamage ?? "", v => { creature.criticalDamage = v || undefined; rerender(); }));
		form.appendChild(this.labeledInput("Notes", creature.notes ?? "", v => { creature.notes = v || undefined; rerender(); }));
		form.appendChild(this.labeledInput("Want & Don't", creature.wantAndDont ?? "", v => { creature.wantAndDont = v || undefined; rerender(); }));

		// Remove
		form.appendChild(button("Remove Creature", () => {
			data.creatures!.splice(index, 1);
			rerender();
		}, "mausritter-btn mausritter-btn-danger"));

		cardDetails.appendChild(form);
		card.appendChild(cardDetails);
		return card;
	}

	// ---- Item section ----

	private renderItemSection(
		container: HTMLElement,
		data: HomebrewData,
		rerender: () => void
	): void {
		const items = data.items ?? [];
		const details = el("details", { class: "mausritter-data-edit-section", "data-section-key": "items" });
		details.appendChild(el("summary", {}, [`Items (${items.length})`]));

		const content = div("mausritter-data-edit-content");

		content.appendChild(button("Add Item", () => {
			if (!data.items) data.items = [];
			data.items.push({
				name: "New Item",
				type: "gear",
				slots: 1, width: 1, height: 1,
			});
			rerender();
		}, "mausritter-btn mausritter-btn-small"));

		items.forEach((item, i) => {
			content.appendChild(this.renderItemCard(item, i, data, rerender));
		});

		details.appendChild(content);
		container.appendChild(details);
	}

	private renderItemCard(
		item: HomebrewItem,
		index: number,
		data: HomebrewData,
		rerender: () => void
	): HTMLElement {
		const card = div("mausritter-data-card");
		const cardDetails = el("details", { "data-section-key": `item-${index}` });
		const typeBadge = item.type;
		cardDetails.appendChild(el("summary", { class: "mausritter-data-card-summary" }, [
			`${item.name} [${typeBadge}]`,
		]));

		const form = div("mausritter-data-card-form");
		form.appendChild(this.labeledInput("Name", item.name, v => { item.name = v; rerender(); }));

		// Type select
		const typeRow = div("mausritter-data-field");
		typeRow.appendChild(el("label", { class: "mausritter-data-field-label" }, ["Type"]));
		const select = el("select", { class: "mausritter-data-input" }) as HTMLSelectElement;
		for (const t of ["weapon", "armour", "gear", "spell", "condition"] as const) {
			const opt = el("option", { value: t }, [t]);
			if (item.type === t) (opt as HTMLOptionElement).selected = true;
			select.appendChild(opt);
		}
		select.addEventListener("change", () => {
			item.type = select.value as "weapon" | "armour" | "gear";
			item.slots = item.width * item.height;
			rerender();
		});
		typeRow.appendChild(select);
		form.appendChild(typeRow);

		// Dimensions
		const dimRow = div("mausritter-data-stats-row");
		dimRow.appendChild(this.labeledNumber("Width", item.width, v => { item.width = Math.max(1, Math.min(2, v)); item.slots = item.width * item.height; rerender(); }));
		dimRow.appendChild(this.labeledNumber("Height", item.height, v => { item.height = Math.max(1, Math.min(2, v)); item.slots = item.width * item.height; rerender(); }));
		form.appendChild(dimRow);

		// Conditional fields
		if (item.type === "weapon") {
			form.appendChild(this.labeledInput("Damage", item.damage ?? "", v => { item.damage = v || undefined; rerender(); }));
		}
		if (item.type === "armour") {
			form.appendChild(this.labeledNumber("Defence", item.defence ?? 0, v => { item.defence = v || undefined; rerender(); }));
		}

		// Usage dots
		const usageRow = div("mausritter-data-stats-row");
		usageRow.appendChild(this.labeledNumber("Usage Dots", item.usage?.total ?? 0, v => {
			if (v > 0) {
				item.usage = { total: v, used: 0 };
			} else {
				item.usage = undefined;
			}
			rerender();
		}));
		form.appendChild(usageRow);

		form.appendChild(this.labeledInput("Description", item.description ?? "", v => { item.description = v || undefined; rerender(); }));

		form.appendChild(button("Remove Item", () => {
			data.items!.splice(index, 1);
			rerender();
		}, "mausritter-btn mausritter-btn-danger"));

		cardDetails.appendChild(form);
		card.appendChild(cardDetails);
		return card;
	}

	// ---- Record sections (weather, landmarks) ----

	private renderRecordSection(
		container: HTMLElement,
		label: string,
		key: "weather" | "landmarks",
		suggestions: string[],
		data: HomebrewData,
		rerender: () => void
	): void {
		const record = (data[key] as Record<string, string[]> | undefined) ?? {};
		const groupCount = Object.keys(record).length;
		const totalEntries = Object.values(record).reduce((sum, arr) => sum + arr.length, 0);

		const details = el("details", { class: "mausritter-data-edit-section", "data-section-key": `record-${key}` });
		details.appendChild(el("summary", {}, [
			`${label} (${groupCount} groups, ${totalEntries} entries)`,
		]));

		const content = div("mausritter-data-edit-content");

		// Add group
		const addRow = div("mausritter-data-add-row");
		const groupInput = el("input", { type: "text", placeholder: `New group (${suggestions.join(", ")})...`, class: "mausritter-data-input" }) as HTMLInputElement;
		addRow.appendChild(groupInput);
		addRow.appendChild(button("Add Group", () => {
			const g = groupInput.value.trim();
			if (!g) return;
			if (!data[key]) (data as any)[key] = {};
			if (!(data[key] as Record<string, string[]>)[g]) {
				(data[key] as Record<string, string[]>)[g] = [];
			}
			rerender();
		}, "mausritter-btn mausritter-btn-small"));
		content.appendChild(addRow);

		// Each group
		for (const [groupName, entries] of Object.entries(record)) {
			const groupDiv = div("mausritter-data-record-group");
			const groupHeader = div("mausritter-data-record-group-header");
			groupHeader.appendChild(el("strong", {}, [groupName]));
			groupHeader.appendChild(button("Remove Group", () => {
				delete (data[key] as Record<string, string[]>)[groupName];
				rerender();
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger"));
			groupDiv.appendChild(groupHeader);

			// Add entry to group
			const entryAddRow = div("mausritter-data-add-row");
			const entryInput = el("input", { type: "text", placeholder: `New ${label.toLowerCase().replace(/s$/, "")}...`, class: "mausritter-data-input" }) as HTMLInputElement;
			entryAddRow.appendChild(entryInput);
			entryAddRow.appendChild(button("Add", () => {
				if (!entryInput.value.trim()) return;
				entries.push(entryInput.value.trim());
				rerender();
			}, "mausritter-btn mausritter-btn-small"));
			groupDiv.appendChild(entryAddRow);

			entries.forEach((entry, ei) => {
				const row = div("mausritter-data-entry-row");
				const inp = el("input", { type: "text", class: "mausritter-data-input mausritter-data-input-wide" }) as HTMLInputElement;
				inp.value = entry;
				inp.addEventListener("change", () => {
					entries[ei] = inp.value;
					rerender();
				});
				row.appendChild(inp);
				row.appendChild(button("X", () => {
					entries.splice(ei, 1);
					rerender();
				}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger"));
				groupDiv.appendChild(row);
			});

			content.appendChild(groupDiv);
		}

		details.appendChild(content);
		container.appendChild(details);
	}

	// ---- Helpers ----

	private labeledInput(
		label: string,
		value: string,
		onChange: (v: string) => void
	): HTMLElement {
		const field = div("mausritter-data-field");
		field.appendChild(el("label", { class: "mausritter-data-field-label" }, [label]));
		const input = el("input", { type: "text", class: "mausritter-data-input mausritter-data-input-wide" }) as HTMLInputElement;
		input.value = value;
		input.addEventListener("change", () => onChange(input.value));
		field.appendChild(input);
		return field;
	}

	private labeledNumber(
		label: string,
		value: number,
		onChange: (v: number) => void
	): HTMLElement {
		const field = div("mausritter-data-stat-field");
		field.appendChild(el("label", { class: "mausritter-data-field-label" }, [label]));
		const input = el("input", { type: "number", class: "mausritter-data-input mausritter-data-input-number" }) as HTMLInputElement;
		input.value = String(value);
		input.addEventListener("change", () => onChange(parseInt(input.value) || 0));
		field.appendChild(input);
		return field;
	}

	/** Remove empty arrays and empty objects so the YAML stays clean */
	private cleanData(data: HomebrewData): HomebrewData {
		const result: HomebrewData = {};
		for (const [key, value] of Object.entries(data)) {
			if (value === undefined || value === null) continue;
			if (Array.isArray(value)) {
				if (value.length > 0) (result as any)[key] = value;
			} else if (typeof value === "object") {
				// Record type — remove empty groups, then skip if no groups remain
				const cleaned: Record<string, string[]> = {};
				for (const [k, v] of Object.entries(value as Record<string, string[]>)) {
					if (v.length > 0) cleaned[k] = v;
				}
				if (Object.keys(cleaned).length > 0) (result as any)[key] = cleaned;
			}
		}
		return result;
	}
}
