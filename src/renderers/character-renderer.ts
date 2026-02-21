import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { Character, Item, GridItem } from "../types/character";
import { generateCharacter } from "../engine/character-creation";
import { rollSave, StatName } from "../engine/saves";
import { shortRest, longRest, fullRest } from "../engine/rest";
import { levelUp, canLevelUp } from "../engine/advancement";
import { usageCheck } from "../engine/dice";
import {
	addConditionToInventory, addItemToPackGrid, removeFromGrid, rotateOnGrid,
	canPlaceOnGrid, buildCellMap, migrateOldInventory, placeOnGrid,
	PACK_ROWS, PACK_COLS, PAW_ROWS, PAW_COLS, BODY_ROWS, BODY_COLS,
} from "../engine/inventory";
import { conditions } from "../data/conditions";
import { weapons, armour, gear } from "../data/items";
import { spellTemplates } from "../data/spells";
import { div, button, span, el } from "../utils/dom-helpers";
import { renderSpellPanels } from "./spell-panel";

type GridName = "paw" | "body" | "pack";

type DragSource = {
	type: "ground";
	index: number;
} | {
	type: "grid";
	gridName: GridName;
	index: number;
};

type DragData = DragSource | null;

function getCharGrid(character: Character, gridName: GridName): GridItem[] {
	switch (gridName) {
		case "paw": return character.pawGrid;
		case "body": return character.bodyGrid;
		case "pack": return character.packGrid;
	}
}

function getGridDims(gridName: GridName): [number, number] {
	switch (gridName) {
		case "paw": return [PAW_ROWS, PAW_COLS];
		case "body": return [BODY_ROWS, BODY_COLS];
		case "pack": return [PACK_ROWS, PACK_COLS];
	}
}

export class CharacterRenderer extends BaseRenderer<Character> {
	protected blockType = "mausritter-character";

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: Character | null,
		updateState: (data: Character) => void
	): void {
		container.addClass("mausritter-character");

		if (!data) {
			this.renderEmpty(container, updateState);
			return;
		}

		// Migrate old inventory format
		migrateOldInventory(data);
		if (!data.ground) data.ground = [];

		this.renderCharacter(container, data, updateState);
	}

	private renderEmpty(container: HTMLElement, updateState: (data: Character) => void): void {
		const emptyDiv = div("mausritter-character-empty", [
			"No character data. Generate a new mouse adventurer!",
		]);
		container.appendChild(emptyDiv);
		container.appendChild(
			button("Generate New Character", () => {
				const character = generateCharacter();
				updateState(character);
			}, "mausritter-btn mausritter-btn-primary")
		);
	}

	private renderCharacter(
		container: HTMLElement,
		character: Character,
		updateState: (data: Character) => void
	): void {
		// Header
		const header = div("mausritter-character-header");
		const nameInput = el("input", { class: "mausritter-character-name", type: "text" }) as HTMLInputElement;
		nameInput.value = character.name;
		nameInput.addEventListener("change", () => {
			character.name = nameInput.value;
			updateState(character);
		});
		header.appendChild(nameInput);
		header.appendChild(span("mausritter-character-info",
			`Level ${character.level} ${character.background} | ${character.birthsign} | ${character.coat} | ${character.physicalDetail}`
		));
		container.appendChild(header);

		// Stats row
		const statsRow = div("mausritter-stats-row");
		for (const statName of ["str", "dex", "wil"] as StatName[]) {
			statsRow.appendChild(this.renderStat(statName, character, updateState));
		}
		container.appendChild(statsRow);

		// HP and Pips row
		const resourceRow = div("mausritter-resource-row");
		resourceRow.appendChild(this.renderHp(character, updateState));
		resourceRow.appendChild(this.renderPips(character, updateState));
		resourceRow.appendChild(this.renderXp(character, updateState));
		container.appendChild(resourceRow);

		// Inventory
		container.appendChild(this.renderInventory(character, updateState));

		// Spell panels (for any spell items across all grids)
		const spellPanel = renderSpellPanels(
			[character.pawGrid, character.bodyGrid, character.packGrid],
			character,
			updateState
		);
		if (spellPanel) container.appendChild(spellPanel);

		// Add item UI
		container.appendChild(this.renderAddItem(character, updateState));

		// Action buttons
		const actions = div("mausritter-actions");

		// Save buttons
		const saveGroup = div("mausritter-action-group");
		saveGroup.appendChild(span("mausritter-action-label", "Save:"));
		for (const stat of ["str", "dex", "wil"] as StatName[]) {
			saveGroup.appendChild(
				button(stat.toUpperCase(), () => {
					const result = rollSave(character, stat);
					character.log.push(
						`${stat.toUpperCase()} save: rolled ${result.roll} vs ${result.statValue} — ${result.success ? "Success!" : "Failure!"}`
					);
					updateState(character);
				}, "mausritter-btn mausritter-btn-small")
			);
		}
		actions.appendChild(saveGroup);

		// Rest buttons
		const restGroup = div("mausritter-action-group");
		restGroup.appendChild(
			button("Short Rest", () => {
				const log = shortRest(character);
				character.log.push(...log);
				updateState(character);
			}, "mausritter-btn mausritter-btn-small")
		);
		restGroup.appendChild(
			button("Long Rest", () => {
				const log = longRest(character, "str");
				character.log.push(...log);
				updateState(character);
			}, "mausritter-btn mausritter-btn-small")
		);
		restGroup.appendChild(
			button("Full Rest", () => {
				const log = fullRest(character);
				character.log.push(...log);
				updateState(character);
			}, "mausritter-btn mausritter-btn-small")
		);
		actions.appendChild(restGroup);

		// Level up
		if (canLevelUp(character)) {
			actions.appendChild(
				button("Level Up!", () => {
					const result = levelUp(character);
					if (result) {
						character.log.push(...result.log);
						updateState(character);
					}
				}, "mausritter-btn mausritter-btn-primary")
			);
		}

		// Add condition
		const condGroup = div("mausritter-action-group");
		condGroup.appendChild(span("mausritter-action-label", "Add Condition:"));
		for (const cond of conditions) {
			condGroup.appendChild(
				button(cond.name, () => {
					const added = addConditionToInventory(character, cond.name);
					if (added) {
						character.log.push(`Gained condition: ${cond.name} — ${cond.effect}`);
					} else {
						character.log.push(`No inventory space for condition: ${cond.name}`);
					}
					updateState(character);
				}, "mausritter-btn mausritter-btn-small mausritter-btn-condition")
			);
		}
		actions.appendChild(condGroup);

		container.appendChild(actions);

		// Action log
		container.appendChild(this.renderLog(character));
	}

	// ---- Stat / Resource renderers ----

	private renderStat(statName: StatName, character: Character, updateState: (data: Character) => void): HTMLElement {
		const stat = character[statName];
		const box = div("mausritter-stat-box");
		box.appendChild(div("mausritter-stat-label", [statName.toUpperCase()]));
		const values = div("mausritter-stat-values");

		const currentInput = el("input", { class: "mausritter-stat-input mausritter-stat-current", type: "number" }) as HTMLInputElement;
		currentInput.value = String(stat.current);
		currentInput.addEventListener("change", () => { stat.current = parseInt(currentInput.value) || 0; updateState(character); });

		const maxInput = el("input", { class: "mausritter-stat-input", type: "number" }) as HTMLInputElement;
		maxInput.value = String(stat.max);
		maxInput.addEventListener("change", () => { stat.max = parseInt(maxInput.value) || 0; updateState(character); });

		values.appendChild(currentInput);
		values.appendChild(span("mausritter-stat-slash", "/"));
		values.appendChild(maxInput);
		box.appendChild(values);
		return box;
	}

	private renderHp(character: Character, updateState: (data: Character) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["HP"]));
		const controls = div("mausritter-resource-controls");
		controls.appendChild(button("-", () => { character.hp.current = Math.max(0, character.hp.current - 1); updateState(character); }, "mausritter-btn mausritter-btn-tiny"));
		controls.appendChild(span("mausritter-resource-value", `${character.hp.current}/${character.hp.max}`));
		controls.appendChild(button("+", () => { character.hp.current = Math.min(character.hp.max, character.hp.current + 1); updateState(character); }, "mausritter-btn mausritter-btn-tiny"));
		box.appendChild(controls);
		return box;
	}

	private renderPips(character: Character, updateState: (data: Character) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["Pips"]));
		const controls = div("mausritter-resource-controls");
		controls.appendChild(button("-", () => { character.pips = Math.max(0, character.pips - 1); updateState(character); }, "mausritter-btn mausritter-btn-tiny"));
		controls.appendChild(span("mausritter-resource-value", String(character.pips)));
		controls.appendChild(button("+", () => { character.pips += 1; updateState(character); }, "mausritter-btn mausritter-btn-tiny"));
		box.appendChild(controls);
		return box;
	}

	private renderXp(character: Character, updateState: (data: Character) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["XP"]));
		const xpInput = el("input", { class: "mausritter-stat-input mausritter-xp-input", type: "number" }) as HTMLInputElement;
		xpInput.value = String(character.xp);
		xpInput.addEventListener("change", () => { character.xp = parseInt(xpInput.value) || 0; updateState(character); });
		box.appendChild(xpInput);
		return box;
	}

	// ---- Inventory ----

	private renderInventory(character: Character, updateState: (data: Character) => void): HTMLElement {
		const section = div("mausritter-inventory");
		section.appendChild(div("mausritter-subtitle", ["Inventory"]));

		// Paw grid (1x2)
		section.appendChild(div("mausritter-slot-label", ["Paws"]));
		section.appendChild(this.renderGrid(character, "paw", updateState));

		// Body grid (1x2)
		section.appendChild(div("mausritter-slot-label", ["Body"]));
		section.appendChild(this.renderGrid(character, "body", updateState));

		// Pack grid (2x3)
		section.appendChild(div("mausritter-slot-label mausritter-pack-label", ["Pack"]));
		section.appendChild(this.renderGrid(character, "pack", updateState));

		// Ground (staging area)
		section.appendChild(this.renderGround(character, updateState));

		return section;
	}

	/** Generic grid renderer for paw (1x2), body (1x2), and pack (2x3) */
	private renderGrid(character: Character, gridName: GridName, updateState: (data: Character) => void): HTMLElement {
		const grid = getCharGrid(character, gridName);
		const [rows, cols] = getGridDims(gridName);
		const cellMap = buildCellMap(grid, rows, cols);
		const renderedItems = new Set<number>();

		const gridEl = div(`mausritter-pack-grid mausritter-grid-${gridName}`);

		for (let r = 0; r < rows; r++) {
			for (let c = 0; c < cols; c++) {
				const itemIndex = cellMap[r][c];

				if (itemIndex >= 0 && !renderedItems.has(itemIndex)) {
					const entry = grid[itemIndex];
					if (entry.row === r && entry.col === c) {
						renderedItems.add(itemIndex);
						const cellEl = div("mausritter-pack-cell mausritter-pack-cell-filled");
						cellEl.style.gridRow = `${r + 1} / span ${entry.item.height}`;
						cellEl.style.gridColumn = `${c + 1} / span ${entry.item.width}`;

						// Make draggable
						cellEl.setAttribute("draggable", "true");
						cellEl.addEventListener("dragstart", (e) => {
							e.dataTransfer?.setData("text/plain", `grid:${gridName}:${itemIndex}`);
						});

						cellEl.appendChild(this.renderItemCard(entry.item, {
							onRemove: () => {
								character.ground.push(entry.item);
								removeFromGrid(grid, itemIndex);
								updateState(character);
							},
							onDelete: () => {
								character.log.push(`Deleted ${entry.item.name}.`);
								removeFromGrid(grid, itemIndex);
								updateState(character);
							},
							onRotate: () => {
								rotateOnGrid(grid, itemIndex, rows, cols);
								updateState(character);
							},
							showRotate: entry.item.width !== entry.item.height,
							onUsageCheck: (item) => this.doUsageCheck(character, item, updateState),
						}));

						// Accept drops onto filled cells (swap)
						this.makeDropTarget(cellEl, (source) => {
							if (source.type === "grid" && source.gridName === gridName && source.index === itemIndex) return;

							const incomingItem = this.getDragItem(character, source);
							if (!incomingItem) return;

							const displacedItem = { ...entry.item };
							removeFromGrid(grid, itemIndex);
							this.removeDragSource(character, source);

							// Place incoming
							if (canPlaceOnGrid(grid, r, c, incomingItem, rows, cols)) {
								grid.push({ item: { ...incomingItem }, row: r, col: c });
							} else {
								character.ground.push({ ...incomingItem });
							}

							// Place displaced back
							const [dRows, dCols] = source.type === "grid" ? getGridDims(source.gridName) : [rows, cols];
							const dGrid = source.type === "grid" ? getCharGrid(character, source.gridName) : grid;
							if (!placeOnGrid(dGrid, displacedItem, dRows, dCols)) {
								character.ground.push(displacedItem);
							}

							updateState(character);
						});

						gridEl.appendChild(cellEl);
					}
				} else if (itemIndex < 0) {
					const cellEl = div("mausritter-pack-cell mausritter-pack-cell-empty");
					cellEl.style.gridRow = `${r + 1}`;
					cellEl.style.gridColumn = `${c + 1}`;

					this.makeDropTarget(cellEl, (source) => {
						const incomingItem = this.getDragItem(character, source);
						if (!incomingItem) return;

						this.removeDragSource(character, source);

						if (canPlaceOnGrid(grid, r, c, incomingItem, rows, cols)) {
							grid.push({ item: { ...incomingItem }, row: r, col: c });
							updateState(character);
						} else {
							// Try rotated
							const rotated = { ...incomingItem, width: incomingItem.height, height: incomingItem.width };
							if (canPlaceOnGrid(grid, r, c, rotated, rows, cols)) {
								grid.push({ item: rotated, row: r, col: c });
								updateState(character);
							} else {
								character.ground.push({ ...incomingItem });
								character.log.push(`${incomingItem.name} doesn't fit there — moved to ground.`);
								updateState(character);
							}
						}
					});

					gridEl.appendChild(cellEl);
				}
			}
		}

		return gridEl;
	}

	/** Render the ground staging area */
	private renderGround(character: Character, updateState: (data: Character) => void): HTMLElement {
		const section = div("mausritter-ground");
		section.appendChild(div("mausritter-slot-label", ["Ground"]));

		const groundItems = div("mausritter-ground-items");

		if (character.ground.length === 0) {
			groundItems.appendChild(span("mausritter-ground-hint", "Drag items here to reorganize"));
		}

		character.ground.forEach((item, index) => {
			const wrapper = div("mausritter-ground-item");
			wrapper.setAttribute("draggable", "true");
			wrapper.setAttribute("data-item-w", String(item.width));
			wrapper.setAttribute("data-item-h", String(item.height));
			wrapper.addEventListener("dragstart", (e) => {
				e.dataTransfer?.setData("text/plain", `ground:${index}`);
			});

			wrapper.appendChild(this.renderItemCard(item, {
				onRemove: () => {
					character.ground.splice(index, 1);
					character.log.push(`Discarded ${item.name}.`);
					updateState(character);
				},
				onDelete: () => {
					character.ground.splice(index, 1);
					character.log.push(`Deleted ${item.name}.`);
					updateState(character);
				},
				onRotate: item.width !== item.height ? () => {
					const temp = item.width;
					item.width = item.height;
					item.height = temp;
					updateState(character);
				} : undefined,
				showRotate: item.width !== item.height,
				onUsageCheck: (it) => this.doUsageCheck(character, it, updateState),
			}));

			groundItems.appendChild(wrapper);
		});

		// Accept drops from any grid onto ground
		this.makeDropTarget(groundItems, (source) => {
			if (source.type === "ground") return;
			const incomingItem = this.getDragItem(character, source);
			if (!incomingItem) return;
			this.removeDragSource(character, source);
			character.ground.push({ ...incomingItem });
			updateState(character);
		});

		section.appendChild(groundItems);
		return section;
	}

	// ---- Drag and drop helpers ----

	private parseDragData(data: string | undefined): DragData {
		if (!data) return null;
		if (data.startsWith("ground:")) {
			const index = parseInt(data.slice("ground:".length));
			return isNaN(index) ? null : { type: "ground", index };
		}
		if (data.startsWith("grid:")) {
			// format: grid:<gridName>:<index>
			const parts = data.split(":");
			if (parts.length !== 3) return null;
			const gridName = parts[1] as GridName;
			const index = parseInt(parts[2]);
			if (!["paw", "body", "pack"].includes(gridName) || isNaN(index)) return null;
			return { type: "grid", gridName, index };
		}
		return null;
	}

	private getDragItem(character: Character, source: DragData): Item | null {
		if (!source) return null;
		if (source.type === "ground") return character.ground[source.index] ?? null;
		const grid = getCharGrid(character, source.gridName);
		return grid[source.index]?.item ?? null;
	}

	private removeDragSource(character: Character, source: DragData): void {
		if (!source) return;
		if (source.type === "ground") {
			character.ground.splice(source.index, 1);
		} else {
			const grid = getCharGrid(character, source.gridName);
			removeFromGrid(grid, source.index);
		}
	}

	private makeDropTarget(element: HTMLElement, onDrop: (source: NonNullable<DragData>) => void): void {
		element.addEventListener("dragover", (e) => {
			e.preventDefault();
			element.addClass("mausritter-slot-dragover");
		});
		element.addEventListener("dragleave", () => {
			element.removeClass("mausritter-slot-dragover");
		});
		element.addEventListener("drop", (e) => {
			e.preventDefault();
			element.removeClass("mausritter-slot-dragover");
			const data = e.dataTransfer?.getData("text/plain");
			const source = this.parseDragData(data);
			if (source) {
				onDrop(source);
			}
		});
	}

	// ---- Item card ----

	private renderItemCard(
		item: Item,
		opts: {
			onRemove: () => void;
			onDelete?: () => void;
			onRotate?: () => void;
			showRotate?: boolean;
			onUsageCheck?: (item: Item) => void;
		}
	): HTMLElement {
		const isCondition = item.type === "condition";
		const itemEl = div(
			`mausritter-item ${isCondition ? "mausritter-item-condition" : `mausritter-item-${item.type}`}`
		);

		if (item.width > 1 || item.height > 1) {
			itemEl.appendChild(span("mausritter-item-size", `${item.width}x${item.height}`));
		}

		itemEl.appendChild(span("mausritter-item-name", item.name));

		if (item.damage) {
			itemEl.appendChild(span("mausritter-item-detail", item.damage));
		}
		if (item.defence) {
			itemEl.appendChild(span("mausritter-item-detail", `+${item.defence} Armour`));
		}

		if (item.usage) {
			const usageEl = div("mausritter-usage-dots");
			for (let i = 0; i < item.usage.total; i++) {
				const dot = span(
					i < item.usage.used ? "mausritter-usage-dot mausritter-usage-used" : "mausritter-usage-dot"
				);
				dot.addEventListener("click", () => {
					if (!item.usage) return;
					item.usage.used = i < item.usage.used ? i : i + 1;
				});
				usageEl.appendChild(dot);
			}
			if (opts.onUsageCheck && item.type !== "spell") {
				usageEl.appendChild(
					button("Check", () => opts.onUsageCheck!(item), "mausritter-btn mausritter-btn-tiny")
				);
			}
			itemEl.appendChild(usageEl);
		}

		const btnRow = div("mausritter-item-actions");

		if (opts.showRotate && opts.onRotate) {
			btnRow.appendChild(
				button("\u21BB", opts.onRotate, "mausritter-btn mausritter-btn-tiny mausritter-btn-rotate")
			);
		}

		btnRow.appendChild(
			button("\u2193", opts.onRemove, "mausritter-btn mausritter-btn-tiny mausritter-btn-to-ground")
		);

		if (opts.onDelete) {
			btnRow.appendChild(
				button("\u2715", opts.onDelete, "mausritter-btn mausritter-btn-tiny mausritter-btn-delete")
			);
		}

		itemEl.appendChild(btnRow);

		return itemEl;
	}

	private doUsageCheck(character: Character, item: Item, updateState: (data: Character) => void): void {
		if (!item.usage) return;
		const result = usageCheck();
		if (result.depleted) {
			item.usage.used = Math.min(item.usage.total, item.usage.used + 1);
			character.log.push(`Usage check on ${item.name}: rolled ${result.roll} — mark dot!`);
			if (item.usage.used >= item.usage.total) {
				character.log.push(`${item.name} is depleted!`);
			}
		} else {
			character.log.push(`Usage check on ${item.name}: rolled ${result.roll} — safe.`);
		}
		updateState(character);
	}

	// ---- Add Item ----

	private renderAddItem(character: Character, updateState: (data: Character) => void): HTMLElement {
		const section = div("mausritter-add-item");
		section.appendChild(div("mausritter-subtitle", ["Add Item"]));

		const row = div("mausritter-add-item-row");

		const categorySelect = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		const spellItems: Omit<Item, "equipped">[] = spellTemplates.map(s => ({
			name: s.name,
			type: "spell" as const,
			slots: 1,
			width: 1,
			height: 1,
			usage: { total: 3, used: 0 },
			description: s.description,
		}));
		const categories: [string, Omit<Item, "equipped">[]][] = [
			["Weapons", weapons],
			["Armour", armour],
			["Gear", gear],
			["Spells", spellItems],
		];
		for (const [label] of categories) {
			categorySelect.appendChild(el("option", { value: label }, [label]));
		}
		row.appendChild(categorySelect);

		const itemSelect = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		const populateItems = () => {
			itemSelect.empty();
			const category = categories.find(([l]) => l === categorySelect.value);
			if (!category) return;
			for (const item of category[1]) {
				const sizeLabel = (item.width > 1 || item.height > 1) ? ` [${item.width}x${item.height}]` : "";
				const label = item.damage
					? `${item.name} (${item.damage})${sizeLabel}`
					: item.defence
					? `${item.name} (+${item.defence} armour)${sizeLabel}`
					: `${item.name}${sizeLabel}`;
				itemSelect.appendChild(el("option", { value: item.name }, [label]));
			}
		};
		populateItems();
		categorySelect.addEventListener("change", populateItems);
		row.appendChild(itemSelect);

		row.appendChild(
			button("Add", () => {
				const category = categories.find(([l]) => l === categorySelect.value);
				if (!category) return;
				const template = category[1].find(i => i.name === itemSelect.value);
				if (!template) return;
				const item: Item = { ...template, equipped: false };
				if (template.usage) item.usage = { ...template.usage };

				const added = addItemToPackGrid(character, item);
				if (added) {
					character.log.push(`Added ${item.name} to pack.`);
				} else {
					character.ground.push(item);
					character.log.push(`No room in pack — ${item.name} placed on ground.`);
				}
				updateState(character);
			}, "mausritter-btn mausritter-btn-primary")
		);

		section.appendChild(row);

		// Custom item entry
		const customRow = div("mausritter-add-item-row");
		const customInput = el("input", { class: "mausritter-oracle-input", type: "text" }) as HTMLInputElement;
		customInput.placeholder = "Custom item name...";
		customRow.appendChild(customInput);

		const sizeSelect = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		for (const [label, w, h] of [["1x1", 1, 1], ["2x1", 2, 1], ["1x2", 1, 2], ["2x2", 2, 2]] as [string, number, number][]) {
			sizeSelect.appendChild(el("option", { value: `${w},${h}` }, [label]));
		}
		customRow.appendChild(sizeSelect);

		customRow.appendChild(
			button("Add Custom", () => {
				const name = customInput.value.trim();
				if (!name) return;
				const [w, h] = sizeSelect.value.split(",").map(Number);
				const item: Item = { name, type: "gear", slots: w * h, width: w, height: h };
				const added = addItemToPackGrid(character, item);
				if (added) {
					character.log.push(`Added ${name} to pack.`);
				} else {
					character.ground.push(item);
					character.log.push(`No room — ${name} placed on ground.`);
				}
				customInput.value = "";
				updateState(character);
			}, "mausritter-btn")
		);

		section.appendChild(customRow);
		return section;
	}

	// ---- Log ----

	private renderLog(character: Character): HTMLElement {
		const logSection = div("mausritter-log");
		logSection.appendChild(div("mausritter-subtitle", ["Action Log"]));
		const entries = [...character.log].reverse().slice(0, 20);
		for (const entry of entries) {
			logSection.appendChild(div("mausritter-log-entry", [entry]));
		}
		return logSection;
	}
}
