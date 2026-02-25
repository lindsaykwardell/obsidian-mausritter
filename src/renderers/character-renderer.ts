import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { Character, Item, GridItem } from "../types/character";
import { generateCharacter } from "../engine/character-creation";
import { rollSave, StatName } from "../engine/saves";
import { shortRest, longRest, fullRest } from "../engine/rest";
import { levelUp, canLevelUp, getGritCapacity } from "../engine/advancement";
import { usageCheck } from "../engine/dice";
import {
	addConditionToInventory, addItemToPackGrid, removeFromGrid, rotateOnGrid,
	canPlaceOnGrid, buildCellMap, migrateOldInventory, placeOnGrid, isEncumbered,
	PACK_ROWS, PACK_COLS, PAW_ROWS, PAW_COLS, BODY_ROWS, BODY_COLS,
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
	private addItemOpen = false;
	private logOpen = false;

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

		// Auto-migrate: add characterType and species if missing
		let migrated = false;
		if (!data.characterType) { data.characterType = "player"; migrated = true; }
		if (!data.species) { data.species = "Mouse"; migrated = true; }

		// Auto-assign ID to existing characters that lack one
		if (!data.id) {
			data.id = crypto.randomUUID();
			migrated = true;
		}
		if (migrated) updateState(data);

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
		// Header row: name + rest buttons
		const header = div("mausritter-character-header");

		const headerTop = div("mausritter-character-header-top");
		const nameInput = el("input", { class: "mausritter-character-name", type: "text" }) as HTMLInputElement;
		nameInput.value = character.name;
		nameInput.addEventListener("change", () => {
			character.name = nameInput.value;
			updateState(character);
		});
		headerTop.appendChild(nameInput);

		// Rest buttons inline with name
		const restRow = div("mausritter-rest-row");
		restRow.appendChild(
			button("Short Rest", () => {
				const log = shortRest(character);
				character.log.push(...log);
				updateState(character);
			}, "mausritter-btn mausritter-btn-tiny")
		);
		restRow.appendChild(
			button("Long Rest", () => {
				const log = longRest(character, "str");
				character.log.push(...log);
				updateState(character);
			}, "mausritter-btn mausritter-btn-tiny")
		);
		restRow.appendChild(
			button("Full Rest", () => {
				const log = fullRest(character);
				character.log.push(...log);
				updateState(character);
			}, "mausritter-btn mausritter-btn-tiny")
		);

		// Level up button (next to rest if available)
		if (canLevelUp(character)) {
			restRow.appendChild(
				button("Level Up!", () => {
					const result = levelUp(character);
					if (result) {
						character.log.push(...result.log);
						updateState(character);
					}
				}, "mausritter-btn mausritter-btn-primary mausritter-btn-tiny")
			);
		}

		headerTop.appendChild(restRow);
		header.appendChild(headerTop);

		// Species input
		const speciesRow = div("mausritter-species-row");
		const speciesLabel = span("mausritter-species-label", "Species:");
		speciesRow.appendChild(speciesLabel);
		const speciesInput = el("input", { class: "mausritter-species-input", type: "text" }) as HTMLInputElement;
		speciesInput.value = character.species || "Mouse";
		speciesInput.addEventListener("change", () => {
			character.species = speciesInput.value.trim() || "Mouse";
			updateState(character);
		});
		speciesRow.appendChild(speciesInput);

		header.appendChild(speciesRow);

		header.appendChild(span("mausritter-character-info",
			`Level ${character.level} ${character.species || "Mouse"} ${character.background || ""} | ${character.birthsign || ""} | ${character.coat || ""} | ${character.physicalDetail || ""}`
		));
		container.appendChild(header);

		// Stats row — each stat box includes its save button
		const statsRow = div("mausritter-stats-row");
		for (const statName of ["str", "dex", "wil"] as StatName[]) {
			statsRow.appendChild(this.renderStat(statName, character, updateState));
		}
		container.appendChild(statsRow);

		// HP, Pips, XP row — HP and Pips as editable inputs
		const resourceRow = div("mausritter-resource-row");
		resourceRow.appendChild(this.renderHp(character, updateState));
		resourceRow.appendChild(this.renderPips(character, updateState));
		resourceRow.appendChild(this.renderXp(character, updateState));
		container.appendChild(resourceRow);

		// Grit slots (Level 2+)
		const gritCapacity = getGritCapacity(character.level);
		if (gritCapacity > 0) {
			container.appendChild(this.renderGritSlots(character, updateState));
		}

		// Encumbrance warning
		if (isEncumbered(character)) {
			const warning = div("mausritter-encumbered-warning", [
				"ENCUMBERED — Cannot run. All saves with Disadvantage."
			]);
			container.appendChild(warning);
		}

		// Inventory
		container.appendChild(this.renderInventory(character, updateState));

		// Item detail panels (spells, magic swords, trinkets, etc.)
		const itemDetailPanel = renderItemDetailPanels(
			[character.pawGrid, character.bodyGrid, character.packGrid],
			character,
			updateState
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
		addItemDetails.appendChild(this.renderAddItem(character, updateState));
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
		logDetails.appendChild(this.renderLog(character));
		container.appendChild(logDetails);
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

		// Save button for this stat
		box.appendChild(
			button("Save", () => {
				const result = rollSave(character, statName);
				character.log.push(
					`${statName.toUpperCase()} save: rolled ${result.roll} vs ${result.statValue} — ${result.success ? "Success!" : "Failure!"}`
				);
				updateState(character);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-save")
		);

		return box;
	}

	private renderHp(character: Character, updateState: (data: Character) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["HP"]));
		const values = div("mausritter-stat-values");

		const currentInput = el("input", { class: "mausritter-stat-input mausritter-stat-current", type: "number" }) as HTMLInputElement;
		currentInput.value = String(character.hp.current);
		currentInput.addEventListener("change", () => {
			character.hp.current = Math.max(0, parseInt(currentInput.value) || 0);
			updateState(character);
		});

		const maxInput = el("input", { class: "mausritter-stat-input", type: "number" }) as HTMLInputElement;
		maxInput.value = String(character.hp.max);
		maxInput.addEventListener("change", () => {
			character.hp.max = Math.max(1, parseInt(maxInput.value) || 1);
			updateState(character);
		});

		values.appendChild(currentInput);
		values.appendChild(span("mausritter-stat-slash", "/"));
		values.appendChild(maxInput);
		box.appendChild(values);
		return box;
	}

	private renderPips(character: Character, updateState: (data: Character) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["Pips"]));

		const pipsInput = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "number" }) as HTMLInputElement;
		pipsInput.value = String(character.pips);
		pipsInput.addEventListener("change", () => {
			character.pips = Math.max(0, parseInt(pipsInput.value) || 0);
			updateState(character);
		});
		box.appendChild(pipsInput);
		return box;
	}

	private renderXp(character: Character, updateState: (data: Character) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["XP"]));
		const xpInput = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "number" }) as HTMLInputElement;
		xpInput.value = String(character.xp);
		xpInput.addEventListener("change", () => { character.xp = parseInt(xpInput.value) || 0; updateState(character); });
		box.appendChild(xpInput);
		return box;
	}

	// ---- Grit Slots ----

	private renderGritSlots(character: Character, updateState: (data: Character) => void): HTMLElement {
		const gritCapacity = getGritCapacity(character.level);
		if (!character.gritSlots) character.gritSlots = [];
		while (character.gritSlots.length < gritCapacity) {
			character.gritSlots.push(null);
		}

		const section = div("mausritter-grit-section");
		section.appendChild(div("mausritter-slot-label", ["Grit"]));

		const slotsRow = div("mausritter-grit-slots");
		for (let i = 0; i < gritCapacity; i++) {
			const slot = character.gritSlots[i];
			if (slot) {
				const slotEl = div("mausritter-grit-slot mausritter-grit-slot-filled");
				slotEl.appendChild(span("mausritter-grit-condition-name", slot.name));
				slotEl.appendChild(span("mausritter-grit-condition-hint", "(clears on full rest)"));
				slotsRow.appendChild(slotEl);
			} else {
				const slotEl = div("mausritter-grit-slot mausritter-grit-slot-empty");
				slotEl.textContent = "Empty";

				// Accept condition drops
				slotEl.addEventListener("dragover", (e) => {
					e.preventDefault();
					slotEl.addClass("mausritter-slot-dragover");
				});
				slotEl.addEventListener("dragleave", () => {
					slotEl.removeClass("mausritter-slot-dragover");
				});
				slotEl.addEventListener("drop", (e) => {
					e.preventDefault();
					slotEl.removeClass("mausritter-slot-dragover");
					const data = e.dataTransfer?.getData("text/plain");
					const source = this.parseDragData(data);
					if (!source) return;
					const item = this.getDragItem(character, source);
					if (!item || item.type !== "condition") return;
					this.removeDragSource(character, source);
					character.gritSlots![i] = { ...item };
					character.log.push(`${item.name} absorbed by Grit (negated).`);
					updateState(character);
				});

				slotsRow.appendChild(slotEl);
			}
		}
		section.appendChild(slotsRow);
		return section;
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
							onGiveTo: (anchor) => this.showGiveDropdown(
								anchor, entry.item,
								() => removeFromGrid(grid, itemIndex),
								character, updateState
							),
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
				onGiveTo: (anchor) => this.showGiveDropdown(
					anchor, item,
					() => { character.ground.splice(index, 1); },
					character, updateState
				),
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
			onGiveTo?: (anchor: HTMLElement) => void;
		}
	): HTMLElement {
		const isCondition = item.type === "condition";
		const itemEl = div(
			`mausritter-item ${isCondition ? "mausritter-item-condition" : `mausritter-item-${item.type}`}`
		);

		// Top-right info (damage dice, defence, size)
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
			// Check button removed — usage tracking is in the Item Details panel
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
		character: Character,
		updateState: (data: Character) => void
	): void {
		// Remove any existing dropdown
		const existing = document.querySelector(".mausritter-give-dropdown");
		if (existing) existing.remove();

		Promise.all([
			findAllEntitySheets(this.plugin),
			findPartyHex(this.plugin),
			findPartySettlement(this.plugin),
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
					const success = await depositItemInBank(this.plugin, settlement.path, settlement.hexId, { ...item });
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
					const success = await giveItemToEntity(this.plugin, sheet, { ...item });
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

		// Standard item picker
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

		// Conditions
		const condRow = div("mausritter-add-item-row mausritter-condition-row");
		condRow.appendChild(span("mausritter-action-label", "Conditions:"));
		for (const cond of conditions) {
			condRow.appendChild(
				button(cond.name, () => {
					const added = addConditionToInventory(character, cond.name);
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

	// ---- Log ----

	private renderLog(character: Character): HTMLElement {
		const logSection = div("mausritter-log");
		const entries = [...character.log].reverse().slice(0, 20);
		for (const entry of entries) {
			logSection.appendChild(div("mausritter-log-entry", [entry]));
		}
		return logSection;
	}
}
