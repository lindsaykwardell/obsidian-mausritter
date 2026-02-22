import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { Character, Item, GridItem } from "../types/character";
import { rollSave, StatName } from "../engine/saves";
import { usageCheck } from "../engine/dice";
import { buildCellMap, migrateOldInventory, PAW_ROWS, PAW_COLS, BODY_ROWS, BODY_COLS } from "../engine/inventory";
import { div, button, span, el } from "../utils/dom-helpers";
import { renderItemDetailPanels } from "./item-detail-panel";

export class CombatCardRenderer extends BaseRenderer<Character> {
	protected blockType = "mausritter-combat-card";
	protected sourceBlockType = "mausritter-character";

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: Character | null,
		updateState: (data: Character) => void
	): void {
		container.addClass("mausritter-combat-card");

		if (!data) {
			// Show a source file input so the user can link a character
			const emptyDiv = div("mausritter-combat-empty");
			emptyDiv.appendChild(span("mausritter-combat-empty-hint", "Link a character file:"));
			const sourceInput = el("input", { class: "mausritter-oracle-input", type: "text", placeholder: "Character file name..." }) as HTMLInputElement;
			emptyDiv.appendChild(sourceInput);
			emptyDiv.appendChild(
				button("Link", () => {
					const name = sourceInput.value.trim();
					if (!name) return;
					updateState({ source: name } as any);
				}, "mausritter-btn mausritter-btn-primary")
			);
			container.appendChild(emptyDiv);
			return;
		}

		migrateOldInventory(data);
		if (!data.ground) data.ground = [];

		// Name + background
		const header = div("mausritter-combat-header");
		header.appendChild(span("mausritter-combat-name", data.name));
		header.appendChild(span("mausritter-combat-info", `Lv${data.level} ${data.background}`));
		container.appendChild(header);

		// Stats row
		const statsRow = div("mausritter-combat-stats");
		for (const statName of ["str", "dex", "wil"] as StatName[]) {
			const stat = data[statName];
			const statEl = div("mausritter-combat-stat");
			statEl.appendChild(span("mausritter-combat-stat-label", statName.toUpperCase()));

			const valRow = div("mausritter-combat-stat-values");
			const currentInput = el("input", { class: "mausritter-combat-stat-input", type: "number" }) as HTMLInputElement;
			currentInput.value = String(stat.current);
			currentInput.addEventListener("change", () => { stat.current = parseInt(currentInput.value) || 0; updateState(data); });
			valRow.appendChild(currentInput);
			valRow.appendChild(span("mausritter-combat-stat-slash", "/"));
			valRow.appendChild(span("mausritter-combat-stat-max", String(stat.max)));
			statEl.appendChild(valRow);

			statsRow.appendChild(statEl);
		}

		// HP
		const hpEl = div("mausritter-combat-stat mausritter-combat-hp");
		hpEl.appendChild(span("mausritter-combat-stat-label", "HP"));
		const hpControls = div("mausritter-combat-stat-values");
		hpControls.appendChild(button("-", () => { data.hp.current = Math.max(0, data.hp.current - 1); updateState(data); }, "mausritter-btn mausritter-btn-tiny"));
		hpControls.appendChild(span("mausritter-combat-hp-value", `${data.hp.current}/${data.hp.max}`));
		hpControls.appendChild(button("+", () => { data.hp.current = Math.min(data.hp.max, data.hp.current + 1); updateState(data); }, "mausritter-btn mausritter-btn-tiny"));
		hpEl.appendChild(hpControls);
		statsRow.appendChild(hpEl);

		container.appendChild(statsRow);

		// Equipped items (paws + body)
		const equippedRow = div("mausritter-combat-equipped");
		this.renderGridItems(equippedRow, data, "Paws", data.pawGrid, PAW_ROWS, PAW_COLS, updateState);
		this.renderGridItems(equippedRow, data, "Body", data.bodyGrid, BODY_ROWS, BODY_COLS, updateState);
		container.appendChild(equippedRow);

		// Item detail panels (spells, swords, etc. — equipped in paw and body)
		const detailPanel = renderItemDetailPanels(
			[data.pawGrid, data.bodyGrid],
			data,
			updateState,
			{ compact: true }
		);
		if (detailPanel) container.appendChild(detailPanel);

		// Conditions from pack
		const conditions = data.packGrid.filter(g => g.item.type === "condition");
		if (conditions.length > 0) {
			const condRow = div("mausritter-combat-conditions");
			for (const c of conditions) {
				condRow.appendChild(span("mausritter-combat-condition-tag", c.item.name));
			}
			container.appendChild(condRow);
		}

		// Save buttons
		const saveRow = div("mausritter-combat-saves");
		saveRow.appendChild(span("mausritter-combat-save-label", "Save:"));
		for (const stat of ["str", "dex", "wil"] as StatName[]) {
			saveRow.appendChild(
				button(stat.toUpperCase(), () => {
					const result = rollSave(data, stat);
					data.log.push(
						`${stat.toUpperCase()} save: rolled ${result.roll} vs ${result.statValue} — ${result.success ? "Success!" : "Failure!"}`
					);
					updateState(data);
				}, "mausritter-btn mausritter-btn-small")
			);
		}
		container.appendChild(saveRow);
	}

	private renderGridItems(
		container: HTMLElement,
		character: Character,
		label: string,
		grid: GridItem[],
		rows: number,
		cols: number,
		updateState: (data: Character) => void
	): void {
		if (grid.length === 0) return;

		const section = div("mausritter-combat-equip-section");
		section.appendChild(span("mausritter-combat-equip-label", label));

		for (const entry of grid) {
			const itemEl = div(`mausritter-combat-item mausritter-item-${entry.item.type}`);
			itemEl.appendChild(span("mausritter-combat-item-name", entry.item.name));

			if (entry.item.damage) {
				itemEl.appendChild(span("mausritter-combat-item-detail", entry.item.damage));
			}
			if (entry.item.defence) {
				itemEl.appendChild(span("mausritter-combat-item-detail", `+${entry.item.defence} Armour`));
			}

			// Usage dots
			if (entry.item.usage) {
				const usageEl = div("mausritter-usage-dots");
				for (let i = 0; i < entry.item.usage.total; i++) {
					const dot = span(
						i < entry.item.usage.used ? "mausritter-usage-dot mausritter-usage-used" : "mausritter-usage-dot"
					);
					dot.addEventListener("click", () => {
						if (!entry.item.usage) return;
						entry.item.usage.used = i < entry.item.usage.used ? i : i + 1;
						updateState(character);
					});
					usageEl.appendChild(dot);
				}
				usageEl.appendChild(
					button("Check", () => {
						if (!entry.item.usage) return;
						const result = usageCheck();
						if (result.depleted) {
							entry.item.usage.used = Math.min(entry.item.usage.total, entry.item.usage.used + 1);
							character.log.push(`Usage check on ${entry.item.name}: rolled ${result.roll} — mark dot!`);
						} else {
							character.log.push(`Usage check on ${entry.item.name}: rolled ${result.roll} — safe.`);
						}
						updateState(character);
					}, "mausritter-btn mausritter-btn-tiny")
				);
				itemEl.appendChild(usageEl);
			}

			section.appendChild(itemEl);
		}

		container.appendChild(section);
	}
}
