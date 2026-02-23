import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { HirelingData } from "../types/hireling";
import { Item, GridItem } from "../types/character";
import { generateHireling, rollMorale } from "../engine/hireling";
import { hirelingTemplates } from "../data/hirelings";
import { rollSave, StatName } from "../engine/saves";
import { canLevelUp, levelUp } from "../engine/advancement";
import { usageCheck } from "../engine/dice";
import {
	removeFromGrid, rotateOnGrid,
	canPlaceOnGrid, buildCellMap, placeOnGrid,
	PAW_ROWS, PAW_COLS, BODY_ROWS, BODY_COLS,
} from "../engine/inventory";
import { conditions } from "../data/conditions";
import { weapons, armour, ammunition, gear } from "../data/items";
import { spellTemplates } from "../data/spells";
import { div, button, span, el } from "../utils/dom-helpers";
import { renderItemDetailPanels } from "./item-detail-panel";
import { findAllEntitySheets, giveItemToEntity, EntitySheetRef } from "../engine/vault-scanner";

export const HIRELING_PACK_ROWS = 1;
export const HIRELING_PACK_COLS = 2;

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

function getHirelingGrid(hireling: HirelingData, gridName: GridName): GridItem[] {
	switch (gridName) {
		case "paw": return hireling.pawGrid;
		case "body": return hireling.bodyGrid;
		case "pack": return hireling.packGrid;
	}
}

function getGridDims(gridName: GridName): [number, number] {
	switch (gridName) {
		case "paw": return [PAW_ROWS, PAW_COLS];
		case "body": return [BODY_ROWS, BODY_COLS];
		case "pack": return [HIRELING_PACK_ROWS, HIRELING_PACK_COLS];
	}
}

export class HirelingRenderer extends BaseRenderer<HirelingData> {
	protected blockType = "mausritter-hireling";
	private addItemOpen = false;
	private logOpen = false;

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: HirelingData | null,
		updateState: (data: HirelingData) => void
	): void {
		container.addClass("mausritter-hireling");

		if (!data) {
			this.renderEmpty(container, updateState);
			return;
		}

		if (!data.ground) data.ground = [];
		if (!data.pawGrid) data.pawGrid = [];
		if (!data.bodyGrid) data.bodyGrid = [];
		if (!data.packGrid) data.packGrid = [];
		if (!data.log) data.log = [];

		// Auto-assign ID to existing hirelings that lack one
		if (!data.id) {
			data.id = crypto.randomUUID();
			updateState(data);
		}

		this.renderHireling(container, data, updateState);
	}

	private renderEmpty(container: HTMLElement, updateState: (data: HirelingData) => void): void {
		const emptyDiv = div("mausritter-character-empty", [
			"No hireling data. Recruit a hireling!",
		]);
		container.appendChild(emptyDiv);

		const row = div("mausritter-add-item-row");

		const typeSelect = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		for (const tmpl of hirelingTemplates) {
			typeSelect.appendChild(
				el("option", { value: tmpl.type }, [`${tmpl.type} (${tmpl.wagesPerDay}p/day)`])
			);
		}
		row.appendChild(typeSelect);

		row.appendChild(
			button("Recruit Hireling", () => {
				const hireling = generateHireling(typeSelect.value);
				updateState(hireling);
			}, "mausritter-btn mausritter-btn-primary")
		);

		container.appendChild(row);
	}

	private renderHireling(
		container: HTMLElement,
		hireling: HirelingData,
		updateState: (data: HirelingData) => void
	): void {
		// Header row: name + type + wages
		const header = div("mausritter-character-header");

		const headerTop = div("mausritter-character-header-top");
		const nameInput = el("input", { class: "mausritter-character-name", type: "text" }) as HTMLInputElement;
		nameInput.value = hireling.name;
		nameInput.placeholder = "Hireling name...";
		nameInput.addEventListener("change", () => {
			hireling.name = nameInput.value;
			updateState(hireling);
		});
		headerTop.appendChild(nameInput);

		// Morale + Level Up buttons
		const actionRow = div("mausritter-rest-row");

		actionRow.appendChild(
			button("Morale", () => {
				const result = rollMorale(hireling);
				hireling.fled = result.fled;
				hireling.log.push(
					`Morale check: rolled ${result.roll} vs WIL ${result.wilValue} — ${result.fled ? "Fled!" : "Holds!"}`
				);
				updateState(hireling);
			}, "mausritter-btn mausritter-btn-tiny")
		);

		if (canLevelUp(hireling as any)) {
			actionRow.appendChild(
				button("Level Up!", () => {
					const result = levelUp(hireling as any);
					if (result) {
						hireling.log.push(...result.log);
						updateState(hireling);
					}
				}, "mausritter-btn mausritter-btn-primary mausritter-btn-tiny")
			);
		}

		headerTop.appendChild(actionRow);
		header.appendChild(headerTop);

		// Info line
		const infoText = `Level ${hireling.level} ${hireling.type} | ${hireling.wagesPerDay}p/day`;
		const infoSpan = span("mausritter-character-info", infoText);
		header.appendChild(infoSpan);

		// Fled badge
		if (hireling.fled) {
			header.appendChild(span("mausritter-hireling-fled-badge", "FLED"));
		}

		container.appendChild(header);

		// Stats row
		const statsRow = div("mausritter-stats-row");
		for (const statName of ["str", "dex", "wil"] as StatName[]) {
			statsRow.appendChild(this.renderStat(statName, hireling, updateState));
		}
		container.appendChild(statsRow);

		// HP, Wages, XP row
		const resourceRow = div("mausritter-resource-row");
		resourceRow.appendChild(this.renderHp(hireling, updateState));
		resourceRow.appendChild(this.renderWages(hireling, updateState));
		resourceRow.appendChild(this.renderXp(hireling, updateState));
		container.appendChild(resourceRow);

		// Inventory
		container.appendChild(this.renderInventory(hireling, updateState));

		// Item detail panels
		const itemDetailPanel = renderItemDetailPanels(
			[hireling.pawGrid, hireling.bodyGrid, hireling.packGrid],
			hireling as any,
			updateState as any
		);
		if (itemDetailPanel) container.appendChild(itemDetailPanel);

		// Add item — collapsible
		const addItemDetails = document.createElement("details");
		addItemDetails.className = "mausritter-collapsible";
		if (this.addItemOpen) addItemDetails.open = true;
		addItemDetails.addEventListener("toggle", () => { this.addItemOpen = addItemDetails.open; });
		const addItemSummary = document.createElement("summary");
		addItemSummary.className = "mausritter-collapsible-summary";
		addItemSummary.textContent = "Add Item / Condition";
		addItemDetails.appendChild(addItemSummary);
		addItemDetails.appendChild(this.renderAddItem(hireling, updateState));
		container.appendChild(addItemDetails);

		// Action log — collapsible
		const logDetails = document.createElement("details");
		logDetails.className = "mausritter-collapsible";
		if (this.logOpen) logDetails.open = true;
		logDetails.addEventListener("toggle", () => { this.logOpen = logDetails.open; });
		const logSummary = document.createElement("summary");
		logSummary.className = "mausritter-collapsible-summary";
		logSummary.textContent = "Action Log";
		logDetails.appendChild(logSummary);
		logDetails.appendChild(this.renderLog(hireling));
		container.appendChild(logDetails);
	}

	// ---- Stat / Resource renderers ----

	private renderStat(statName: StatName, hireling: HirelingData, updateState: (data: HirelingData) => void): HTMLElement {
		const stat = hireling[statName];
		const box = div("mausritter-stat-box");
		box.appendChild(div("mausritter-stat-label", [statName.toUpperCase()]));
		const values = div("mausritter-stat-values");

		const currentInput = el("input", { class: "mausritter-stat-input mausritter-stat-current", type: "number" }) as HTMLInputElement;
		currentInput.value = String(stat.current);
		currentInput.addEventListener("change", () => { stat.current = parseInt(currentInput.value) || 0; updateState(hireling); });

		const maxInput = el("input", { class: "mausritter-stat-input", type: "number" }) as HTMLInputElement;
		maxInput.value = String(stat.max);
		maxInput.addEventListener("change", () => { stat.max = parseInt(maxInput.value) || 0; updateState(hireling); });

		values.appendChild(currentInput);
		values.appendChild(span("mausritter-stat-slash", "/"));
		values.appendChild(maxInput);
		box.appendChild(values);

		box.appendChild(
			button("Save", () => {
				const result = rollSave(hireling as any, statName);
				hireling.log.push(
					`${statName.toUpperCase()} save: rolled ${result.roll} vs ${result.statValue} — ${result.success ? "Success!" : "Failure!"}`
				);
				updateState(hireling);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-save")
		);

		return box;
	}

	private renderHp(hireling: HirelingData, updateState: (data: HirelingData) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["HP"]));
		const values = div("mausritter-stat-values");

		const currentInput = el("input", { class: "mausritter-stat-input mausritter-stat-current", type: "number" }) as HTMLInputElement;
		currentInput.value = String(hireling.hp.current);
		currentInput.addEventListener("change", () => {
			hireling.hp.current = Math.max(0, parseInt(currentInput.value) || 0);
			updateState(hireling);
		});

		const maxInput = el("input", { class: "mausritter-stat-input", type: "number" }) as HTMLInputElement;
		maxInput.value = String(hireling.hp.max);
		maxInput.addEventListener("change", () => {
			hireling.hp.max = Math.max(1, parseInt(maxInput.value) || 1);
			updateState(hireling);
		});

		values.appendChild(currentInput);
		values.appendChild(span("mausritter-stat-slash", "/"));
		values.appendChild(maxInput);
		box.appendChild(values);
		return box;
	}

	private renderWages(hireling: HirelingData, updateState: (data: HirelingData) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["Wages"]));
		const wagesInput = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "number" }) as HTMLInputElement;
		wagesInput.value = String(hireling.wagesPerDay);
		wagesInput.addEventListener("change", () => {
			hireling.wagesPerDay = Math.max(0, parseInt(wagesInput.value) || 0);
			updateState(hireling);
		});
		box.appendChild(wagesInput);
		box.appendChild(span("mausritter-resource-unit", "p/day"));
		return box;
	}

	private renderXp(hireling: HirelingData, updateState: (data: HirelingData) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["XP"]));
		const xpInput = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "number" }) as HTMLInputElement;
		xpInput.value = String(hireling.xp);
		xpInput.addEventListener("change", () => { hireling.xp = parseInt(xpInput.value) || 0; updateState(hireling); });
		box.appendChild(xpInput);
		return box;
	}

	// ---- Inventory ----

	private renderInventory(hireling: HirelingData, updateState: (data: HirelingData) => void): HTMLElement {
		const section = div("mausritter-inventory");
		section.appendChild(div("mausritter-subtitle", ["Inventory"]));

		section.appendChild(div("mausritter-slot-label", ["Paws"]));
		section.appendChild(this.renderGrid(hireling, "paw", updateState));

		section.appendChild(div("mausritter-slot-label", ["Body"]));
		section.appendChild(this.renderGrid(hireling, "body", updateState));

		section.appendChild(div("mausritter-slot-label mausritter-pack-label", ["Pack"]));
		section.appendChild(this.renderGrid(hireling, "pack", updateState));

		section.appendChild(this.renderGround(hireling, updateState));

		return section;
	}

	private renderGrid(hireling: HirelingData, gridName: GridName, updateState: (data: HirelingData) => void): HTMLElement {
		const grid = getHirelingGrid(hireling, gridName);
		const [rows, cols] = getGridDims(gridName);
		const cellMap = buildCellMap(grid, rows, cols);
		const renderedItems = new Set<number>();

		const gridEl = div(`mausritter-pack-grid mausritter-grid-${gridName === "pack" ? "hireling-pack" : gridName}`);

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

						cellEl.setAttribute("draggable", "true");
						cellEl.addEventListener("dragstart", (e) => {
							e.dataTransfer?.setData("text/plain", `grid:${gridName}:${itemIndex}`);
						});

						cellEl.appendChild(this.renderItemCard(entry.item, {
							onRemove: () => {
								hireling.ground.push(entry.item);
								removeFromGrid(grid, itemIndex);
								updateState(hireling);
							},
							onDelete: () => {
								hireling.log.push(`Deleted ${entry.item.name}.`);
								removeFromGrid(grid, itemIndex);
								updateState(hireling);
							},
							onRotate: () => {
								rotateOnGrid(grid, itemIndex, rows, cols);
								updateState(hireling);
							},
							showRotate: entry.item.width !== entry.item.height,
							onGiveTo: (anchor) => this.showGiveDropdown(
								anchor, entry.item,
								() => removeFromGrid(grid, itemIndex),
								hireling, updateState
							),
						}));

						this.makeDropTarget(cellEl, (source) => {
							if (source.type === "grid" && source.gridName === gridName && source.index === itemIndex) return;

							const incomingItem = this.getDragItem(hireling, source);
							if (!incomingItem) return;

							const displacedItem = { ...entry.item };
							removeFromGrid(grid, itemIndex);
							this.removeDragSource(hireling, source);

							if (canPlaceOnGrid(grid, r, c, incomingItem, rows, cols)) {
								grid.push({ item: { ...incomingItem }, row: r, col: c });
							} else {
								hireling.ground.push({ ...incomingItem });
							}

							const [dRows, dCols] = source.type === "grid" ? getGridDims(source.gridName) : [rows, cols];
							const dGrid = source.type === "grid" ? getHirelingGrid(hireling, source.gridName) : grid;
							if (!placeOnGrid(dGrid, displacedItem, dRows, dCols)) {
								hireling.ground.push(displacedItem);
							}

							updateState(hireling);
						});

						gridEl.appendChild(cellEl);
					}
				} else if (itemIndex < 0) {
					const cellEl = div("mausritter-pack-cell mausritter-pack-cell-empty");
					cellEl.style.gridRow = `${r + 1}`;
					cellEl.style.gridColumn = `${c + 1}`;

					this.makeDropTarget(cellEl, (source) => {
						const incomingItem = this.getDragItem(hireling, source);
						if (!incomingItem) return;

						this.removeDragSource(hireling, source);

						if (canPlaceOnGrid(grid, r, c, incomingItem, rows, cols)) {
							grid.push({ item: { ...incomingItem }, row: r, col: c });
							updateState(hireling);
						} else {
							const rotated = { ...incomingItem, width: incomingItem.height, height: incomingItem.width };
							if (canPlaceOnGrid(grid, r, c, rotated, rows, cols)) {
								grid.push({ item: rotated, row: r, col: c });
								updateState(hireling);
							} else {
								hireling.ground.push({ ...incomingItem });
								hireling.log.push(`${incomingItem.name} doesn't fit there — moved to ground.`);
								updateState(hireling);
							}
						}
					});

					gridEl.appendChild(cellEl);
				}
			}
		}

		return gridEl;
	}

	private renderGround(hireling: HirelingData, updateState: (data: HirelingData) => void): HTMLElement {
		const section = div("mausritter-ground");
		section.appendChild(div("mausritter-slot-label", ["Ground"]));

		const groundItems = div("mausritter-ground-items");

		if (hireling.ground.length === 0) {
			groundItems.appendChild(span("mausritter-ground-hint", "Drag items here to reorganize"));
		}

		hireling.ground.forEach((item, index) => {
			const wrapper = div("mausritter-ground-item");
			wrapper.setAttribute("draggable", "true");
			wrapper.setAttribute("data-item-w", String(item.width));
			wrapper.setAttribute("data-item-h", String(item.height));
			wrapper.addEventListener("dragstart", (e) => {
				e.dataTransfer?.setData("text/plain", `ground:${index}`);
			});

			wrapper.appendChild(this.renderItemCard(item, {
				onRemove: () => {
					hireling.ground.splice(index, 1);
					hireling.log.push(`Discarded ${item.name}.`);
					updateState(hireling);
				},
				onDelete: () => {
					hireling.ground.splice(index, 1);
					hireling.log.push(`Deleted ${item.name}.`);
					updateState(hireling);
				},
				onRotate: item.width !== item.height ? () => {
					const temp = item.width;
					item.width = item.height;
					item.height = temp;
					updateState(hireling);
				} : undefined,
				showRotate: item.width !== item.height,
				onGiveTo: (anchor) => this.showGiveDropdown(
					anchor, item,
					() => { hireling.ground.splice(index, 1); },
					hireling, updateState
				),
			}));

			groundItems.appendChild(wrapper);
		});

		this.makeDropTarget(groundItems, (source) => {
			if (source.type === "ground") return;
			const incomingItem = this.getDragItem(hireling, source);
			if (!incomingItem) return;
			this.removeDragSource(hireling, source);
			hireling.ground.push({ ...incomingItem });
			updateState(hireling);
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
			const parts = data.split(":");
			if (parts.length !== 3) return null;
			const gridName = parts[1] as GridName;
			const index = parseInt(parts[2]);
			if (!["paw", "body", "pack"].includes(gridName) || isNaN(index)) return null;
			return { type: "grid", gridName, index };
		}
		return null;
	}

	private getDragItem(hireling: HirelingData, source: DragData): Item | null {
		if (!source) return null;
		if (source.type === "ground") return hireling.ground[source.index] ?? null;
		const grid = getHirelingGrid(hireling, source.gridName);
		return grid[source.index]?.item ?? null;
	}

	private removeDragSource(hireling: HirelingData, source: DragData): void {
		if (!source) return;
		if (source.type === "ground") {
			hireling.ground.splice(source.index, 1);
		} else {
			const grid = getHirelingGrid(hireling, source.gridName);
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
			onGiveTo?: (anchor: HTMLElement) => void;
		}
	): HTMLElement {
		const isCondition = item.type === "condition";
		const itemEl = div(
			`mausritter-item ${isCondition ? "mausritter-item-condition" : `mausritter-item-${item.type}`}`
		);

		const topRight: string[] = [];
		if (item.damage) topRight.push(item.damage);
		if (item.defence) topRight.push(`+${item.defence}`);
		if (item.width > 1 || item.height > 1) topRight.push(`${item.width}x${item.height}`);
		if (topRight.length > 0) {
			itemEl.appendChild(span("mausritter-item-topright", topRight.join(" ")));
		}

		itemEl.appendChild(span("mausritter-item-name", item.name));

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
			itemEl.appendChild(usageEl);
		}

		const btnRow = div("mausritter-item-actions");

		if (opts.onGiveTo) {
			const giveTo = opts.onGiveTo;
			const giveBtn = button("\u2192", () => giveTo(giveBtn), "mausritter-btn mausritter-btn-tiny mausritter-btn-give");
			btnRow.appendChild(giveBtn);
		}

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

	private showGiveDropdown(
		anchor: HTMLElement,
		item: Item,
		removeItem: () => void,
		hireling: HirelingData,
		updateState: (data: HirelingData) => void
	): void {
		const existing = document.querySelector(".mausritter-give-dropdown");
		if (existing) existing.remove();

		findAllEntitySheets(this.plugin).then(sheets => {
			const filtered = sheets.filter(s => !hireling.id || s.id !== hireling.id);
			if (filtered.length === 0) {
				anchor.textContent = "!";
				setTimeout(() => { anchor.textContent = "\u2192"; }, 1500);
				return;
			}

			const dropdown = div("mausritter-give-dropdown");
			const rect = anchor.getBoundingClientRect();
			dropdown.style.top = `${rect.bottom + window.scrollY}px`;
			dropdown.style.left = `${rect.left + window.scrollX}px`;

			for (const sheet of filtered) {
				const label = `${sheet.name} (${sheet.entityType})`;
				const option = button(label, async () => {
					const success = await giveItemToEntity(this.plugin, sheet, { ...item });
					if (success) {
						removeItem();
						hireling.log.push(`Gave ${item.name} to ${sheet.name}.`);
						updateState(hireling);
					}
					dropdown.remove();
				}, "mausritter-give-dropdown-option");
				dropdown.appendChild(option);
			}

			const closeHandler = (e: MouseEvent) => {
				if (!dropdown.contains(e.target as Node) && e.target !== anchor) {
					dropdown.remove();
					document.removeEventListener("click", closeHandler);
				}
			};
			setTimeout(() => document.addEventListener("click", closeHandler), 0);

			document.body.appendChild(dropdown);
		});
	}

	// ---- Add Item ----

	private renderAddItem(hireling: HirelingData, updateState: (data: HirelingData) => void): HTMLElement {
		const section = div("mausritter-add-item");

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
			["Ammunition", ammunition],
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

				const added = placeOnGrid(hireling.packGrid, item, HIRELING_PACK_ROWS, HIRELING_PACK_COLS);
				if (added) {
					hireling.log.push(`Added ${item.name} to pack.`);
				} else {
					hireling.ground.push(item);
					hireling.log.push(`No room in pack — ${item.name} placed on ground.`);
				}
				updateState(hireling);
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
				const added = placeOnGrid(hireling.packGrid, item, HIRELING_PACK_ROWS, HIRELING_PACK_COLS);
				if (added) {
					hireling.log.push(`Added ${name} to pack.`);
				} else {
					hireling.ground.push(item);
					hireling.log.push(`No room — ${name} placed on ground.`);
				}
				customInput.value = "";
				updateState(hireling);
			}, "mausritter-btn")
		);

		section.appendChild(customRow);

		// Conditions
		const condRow = div("mausritter-add-item-row mausritter-condition-row");
		condRow.appendChild(span("mausritter-action-label", "Conditions:"));
		for (const cond of conditions) {
			condRow.appendChild(
				button(cond.name, () => {
					const conditionItem: Item = {
						name: cond.name,
						type: "condition",
						slots: 1,
						width: 1,
						height: 1,
					};
					const added = placeOnGrid(hireling.packGrid, conditionItem, HIRELING_PACK_ROWS, HIRELING_PACK_COLS);
					if (added) {
						hireling.log.push(`Gained condition: ${cond.name} — ${cond.effect}`);
					} else {
						hireling.log.push(`No inventory space for condition: ${cond.name}`);
					}
					updateState(hireling);
				}, "mausritter-btn mausritter-btn-tiny mausritter-btn-condition")
			);
		}
		section.appendChild(condRow);

		return section;
	}

	// ---- Log ----

	private renderLog(hireling: HirelingData): HTMLElement {
		const logSection = div("mausritter-log");
		const entries = [...hireling.log].reverse().slice(0, 20);
		for (const entry of entries) {
			logSection.appendChild(div("mausritter-log-entry", [entry]));
		}
		return logSection;
	}
}
