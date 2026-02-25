import { Plugin } from "obsidian";
import { Character, Item, GridItem } from "../types/character";
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
import { findAllEntitySheets, findPartyHex, giveItemToEntity, findPartySettlement, depositItemInBank, EntitySheetRef } from "../engine/vault-scanner";

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

export interface InventoryPanelOpts {
	packRows: number;
	packCols: number;
	/** Scope ID prefix for drag data to prevent cross-entity drag-and-drop */
	scopeId?: string;
}

function getGrid(character: Character, gridName: GridName): GridItem[] {
	switch (gridName) {
		case "paw": return character.pawGrid;
		case "body": return character.bodyGrid;
		case "pack": return character.packGrid;
	}
}

function getGridDims(gridName: GridName, opts: InventoryPanelOpts): [number, number] {
	switch (gridName) {
		case "paw": return [PAW_ROWS, PAW_COLS];
		case "body": return [BODY_ROWS, BODY_COLS];
		case "pack": return [opts.packRows, opts.packCols];
	}
}

function prefixDrag(data: string, scopeId?: string): string {
	return scopeId ? `${scopeId}|${data}` : data;
}

function parseDragData(data: string | undefined, scopeId?: string): DragData {
	if (!data) return null;
	// Strip scope prefix if present
	if (scopeId) {
		if (!data.startsWith(`${scopeId}|`)) return null; // Wrong scope
		data = data.slice(scopeId.length + 1);
	} else if (data.includes("|")) {
		// Has a scope prefix but we don't expect one — ignore
		return null;
	}
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

function getDragItem(character: Character, source: DragData): Item | null {
	if (!source) return null;
	if (source.type === "ground") return character.ground[source.index] ?? null;
	const grid = getGrid(character, source.gridName);
	return grid[source.index]?.item ?? null;
}

function removeDragSource(character: Character, source: DragData): void {
	if (!source) return;
	if (source.type === "ground") {
		character.ground.splice(source.index, 1);
	} else {
		const grid = getGrid(character, source.gridName);
		removeFromGrid(grid, source.index);
	}
}

function makeDropTarget(element: HTMLElement, scopeId: string | undefined, onDrop: (source: NonNullable<DragData>) => void): void {
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
		const source = parseDragData(data, scopeId);
		if (source) {
			onDrop(source);
		}
	});
}

/** Render the full inventory panel (paw, body, pack grids + ground) */
export function renderInventoryPanel(
	container: HTMLElement,
	character: Character,
	updateState: (data: Character) => void,
	plugin: Plugin,
	opts: InventoryPanelOpts
): void {
	const section = div("mausritter-inventory");
	section.appendChild(div("mausritter-subtitle", ["Inventory"]));

	section.appendChild(div("mausritter-slot-label", ["Paws"]));
	section.appendChild(renderGrid(character, "paw", updateState, plugin, opts));

	section.appendChild(div("mausritter-slot-label", ["Body"]));
	section.appendChild(renderGrid(character, "body", updateState, plugin, opts));

	section.appendChild(div("mausritter-slot-label mausritter-pack-label", ["Pack"]));
	section.appendChild(renderGrid(character, "pack", updateState, plugin, opts));

	section.appendChild(renderGround(character, updateState, plugin, opts));

	container.appendChild(section);

	// Item detail panels
	const itemDetailPanel = renderItemDetailPanels(
		[character.pawGrid, character.bodyGrid, character.packGrid],
		character,
		updateState
	);
	if (itemDetailPanel) container.appendChild(itemDetailPanel);
}

function renderGrid(
	character: Character,
	gridName: GridName,
	updateState: (data: Character) => void,
	plugin: Plugin,
	opts: InventoryPanelOpts
): HTMLElement {
	const grid = getGrid(character, gridName);
	const [rows, cols] = getGridDims(gridName, opts);
	const cellMap = buildCellMap(grid, rows, cols);
	const renderedItems = new Set<number>();
	const scopeId = opts.scopeId;

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
						e.dataTransfer?.setData("text/plain", prefixDrag(`grid:${gridName}:${itemIndex}`, scopeId));
					});

					cellEl.appendChild(renderItemCard(entry.item, {
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
						onGiveTo: (anchor) => showGiveDropdown(
							anchor, entry.item,
							() => removeFromGrid(grid, itemIndex),
							character, updateState, plugin
						),
					}));

					makeDropTarget(cellEl, scopeId, (source) => {
						if (source.type === "grid" && source.gridName === gridName && source.index === itemIndex) return;

						const incomingItem = getDragItem(character, source);
						if (!incomingItem) return;

						const displacedItem = { ...entry.item };
						removeFromGrid(grid, itemIndex);
						removeDragSource(character, source);

						if (canPlaceOnGrid(grid, r, c, incomingItem, rows, cols)) {
							grid.push({ item: { ...incomingItem }, row: r, col: c });
						} else {
							character.ground.push({ ...incomingItem });
						}

						const [dRows, dCols] = source.type === "grid" ? getGridDims(source.gridName, opts) : [rows, cols];
						const dGrid = source.type === "grid" ? getGrid(character, source.gridName) : grid;
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

				makeDropTarget(cellEl, scopeId, (source) => {
					const incomingItem = getDragItem(character, source);
					if (!incomingItem) return;

					removeDragSource(character, source);

					if (canPlaceOnGrid(grid, r, c, incomingItem, rows, cols)) {
						grid.push({ item: { ...incomingItem }, row: r, col: c });
						updateState(character);
					} else {
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

function renderGround(
	character: Character,
	updateState: (data: Character) => void,
	plugin: Plugin,
	opts: InventoryPanelOpts
): HTMLElement {
	const section = div("mausritter-ground");
	section.appendChild(div("mausritter-slot-label", ["Ground"]));
	const scopeId = opts.scopeId;

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
			e.dataTransfer?.setData("text/plain", prefixDrag(`ground:${index}`, scopeId));
		});

		wrapper.appendChild(renderItemCard(item, {
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
			onGiveTo: (anchor) => showGiveDropdown(
				anchor, item,
				() => { character.ground.splice(index, 1); },
				character, updateState, plugin
			),
		}));

		groundItems.appendChild(wrapper);
	});

	makeDropTarget(groundItems, scopeId, (source) => {
		if (source.type === "ground") return;
		const incomingItem = getDragItem(character, source);
		if (!incomingItem) return;
		removeDragSource(character, source);
		character.ground.push({ ...incomingItem });
		updateState(character);
	});

	section.appendChild(groundItems);
	return section;
}

export function renderItemCard(
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

export function showGiveDropdown(
	anchor: HTMLElement,
	item: Item,
	removeItem: () => void,
	character: Character,
	updateState: (data: Character) => void,
	plugin: Plugin
): void {
	const existing = document.querySelector(".mausritter-give-dropdown");
	if (existing) existing.remove();

	Promise.all([
		findAllEntitySheets(plugin),
		findPartyHex(plugin),
		findPartySettlement(plugin),
	]).then(([sheets, partyHex, settlement]) => {
		const filtered = sheets.filter(s => {
			if (character.id && s.id === character.id) return false;
			if (s.entityType === "npc") {
				return s.hexId != null && s.hexId >= 0 && s.hexId === partyHex;
			}
			return true;
		});
		if (filtered.length === 0 && !settlement) {
			anchor.textContent = "!";
			setTimeout(() => { anchor.textContent = "\u2192"; }, 1500);
			return;
		}

		const dropdown = div("mausritter-give-dropdown");
		const rect = anchor.getBoundingClientRect();
		dropdown.style.top = `${rect.bottom + window.scrollY}px`;
		dropdown.style.left = `${rect.left + window.scrollX}px`;

		// Settlement bank option (only if party is at a settlement)
		if (settlement) {
			const bankOption = button(`Bank (${settlement.settlementName})`, async () => {
				const success = await depositItemInBank(plugin, settlement.path, settlement.hexId, { ...item });
				if (success) {
					removeItem();
					character.log.push(`Deposited ${item.name} in ${settlement.settlementName} bank.`);
					updateState(character);
				}
				dropdown.remove();
			}, "mausritter-give-dropdown-option");
			dropdown.appendChild(bankOption);
		}

		for (const sheet of filtered) {
			const label = `${sheet.name} (${sheet.entityType})`;
			const option = button(label, async () => {
				const success = await giveItemToEntity(plugin, sheet, { ...item });
				if (success) {
					removeItem();
					character.log.push(`Gave ${item.name} to ${sheet.name}.`);
					updateState(character);
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

/** Render the add-item / condition section */
export function renderAddItemPanel(
	character: Character,
	updateState: (data: Character) => void,
	packRows: number,
	packCols: number
): HTMLElement {
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

			const added = placeOnGrid(character.packGrid, item, packRows, packCols);
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
			const added = placeOnGrid(character.packGrid, item, packRows, packCols);
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
				const added = placeOnGrid(character.packGrid, conditionItem, packRows, packCols);
				if (added) {
					character.log.push(`Gained condition: ${cond.name} — ${cond.effect}`);
				} else {
					character.log.push(`No inventory space for condition: ${cond.name}`);
				}
				updateState(character);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-condition")
		);
	}
	section.appendChild(condRow);

	return section;
}

/** Render the action log */
export function renderLog(character: Character): HTMLElement {
	const logSection = div("mausritter-log");
	const entries = [...character.log].reverse().slice(0, 20);
	for (const entry of entries) {
		logSection.appendChild(div("mausritter-log-entry", [entry]));
	}
	return logSection;
}
