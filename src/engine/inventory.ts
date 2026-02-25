import { Character, Item, GridItem } from "../types/character";

// Grid dimension constants
export const PACK_ROWS = 2;
export const PACK_COLS = 3;
export const PAW_ROWS = 1;
export const PAW_COLS = 2;
export const BODY_ROWS = 1;
export const BODY_COLS = 2;
export const HIRELING_PACK_ROWS = 1;
export const HIRELING_PACK_COLS = 2;

// ---- Grid operations ----

/** Get the cells an item would occupy at a given position */
export function getOccupiedCells(row: number, col: number, item: Item): [number, number][] {
	const cells: [number, number][] = [];
	for (let r = 0; r < item.height; r++) {
		for (let c = 0; c < item.width; c++) {
			cells.push([row + r, col + c]);
		}
	}
	return cells;
}

/** Check if an item fits at a position on a grid with given dimensions */
export function canPlaceOnGrid(
	grid: GridItem[],
	row: number,
	col: number,
	item: Item,
	gridRows: number,
	gridCols: number,
	excludeIndex?: number
): boolean {
	const cells = getOccupiedCells(row, col, item);

	// Check bounds
	for (const [r, c] of cells) {
		if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) return false;
	}

	// Check collisions with existing items
	for (let i = 0; i < grid.length; i++) {
		if (i === excludeIndex) continue;
		const existing = grid[i];
		const existingCells = getOccupiedCells(existing.row, existing.col, existing.item);
		for (const [r, c] of cells) {
			if (existingCells.some(([er, ec]) => er === r && ec === c)) {
				return false;
			}
		}
	}

	return true;
}

/** Place an item on a grid at the first available position */
export function placeOnGrid(grid: GridItem[], item: Item, gridRows: number, gridCols: number): boolean {
	// Try every position, including rotated
	for (const tryItem of [item, rotateItem(item)]) {
		for (let r = 0; r < gridRows; r++) {
			for (let c = 0; c < gridCols; c++) {
				if (canPlaceOnGrid(grid, r, c, tryItem, gridRows, gridCols)) {
					grid.push({ item: { ...tryItem }, row: r, col: c });
					return true;
				}
			}
		}
	}
	return false;
}

/** Remove an item from the grid by index */
export function removeFromGrid(grid: GridItem[], index: number): Item | null {
	if (index < 0 || index >= grid.length) return null;
	const removed = grid.splice(index, 1);
	return removed[0]?.item ?? null;
}

/** Move a grid item to a new position */
export function moveOnGrid(grid: GridItem[], index: number, newRow: number, newCol: number, gridRows: number, gridCols: number): boolean {
	const entry = grid[index];
	if (!entry) return false;
	if (!canPlaceOnGrid(grid, newRow, newCol, entry.item, gridRows, gridCols, index)) return false;
	entry.row = newRow;
	entry.col = newCol;
	return true;
}

/** Rotate an item (swap width and height) */
export function rotateItem(item: Item): Item {
	return { ...item, width: item.height, height: item.width };
}

/** Rotate a placed grid item in-place if it still fits */
export function rotateOnGrid(grid: GridItem[], index: number, gridRows: number, gridCols: number): boolean {
	const entry = grid[index];
	if (!entry) return false;

	if (entry.item.width === entry.item.height) return true;

	const rotated = rotateItem(entry.item);

	if (canPlaceOnGrid(grid, entry.row, entry.col, rotated, gridRows, gridCols, index)) {
		entry.item = rotated;
		return true;
	}

	for (let r = Math.max(0, entry.row - 1); r < gridRows; r++) {
		for (let c = Math.max(0, entry.col - 1); c < gridCols; c++) {
			if (canPlaceOnGrid(grid, r, c, rotated, gridRows, gridCols, index)) {
				entry.item = rotated;
				entry.row = r;
				entry.col = c;
				return true;
			}
		}
	}

	return false;
}

/** Build a 2D lookup: which grid item index occupies each cell (or -1) */
export function buildCellMap(grid: GridItem[], gridRows: number, gridCols: number): number[][] {
	const map: number[][] = Array.from({ length: gridRows }, () =>
		Array.from({ length: gridCols }, () => -1)
	);
	for (let i = 0; i < grid.length; i++) {
		const cells = getOccupiedCells(grid[i].row, grid[i].col, grid[i].item);
		for (const [r, c] of cells) {
			if (r < gridRows && c < gridCols) {
				map[r][c] = i;
			}
		}
	}
	return map;
}

// ---- High-level helpers ----

/** Add item directly to pack grid */
export function addItemToPackGrid(character: Character, item: Item): boolean {
	return placeOnGrid(character.packGrid, item, PACK_ROWS, PACK_COLS);
}

export function addConditionToInventory(character: Character, conditionName: string): boolean {
	const conditionItem: Item = {
		name: conditionName,
		type: "condition",
		slots: 1,
		width: 1,
		height: 1,
	};
	return placeOnGrid(character.packGrid, conditionItem, PACK_ROWS, PACK_COLS);
}

/** Check if character is encumbered (items overflow beyond grid capacity) */
export function isEncumbered(character: Character): boolean {
	return character.ground.length > 0;
}

/** Migrate old InventorySlot[] format to grid format */
export function migrateOldInventory(character: Character): void {
	// If character already has grid fields, skip
	if (character.pawGrid && character.bodyGrid && character.packGrid) return;

	if (!character.pawGrid) character.pawGrid = [];
	if (!character.bodyGrid) character.bodyGrid = [];
	if (!character.packGrid) character.packGrid = [];

	// Migrate from old inventory array if present
	const oldInventory = (character as any).inventory;
	if (Array.isArray(oldInventory)) {
		for (const slot of oldInventory) {
			if (!slot.item) continue;
			if (slot.type === "paw-main" || slot.id === "paw-main") {
				placeOnGrid(character.pawGrid, slot.item, PAW_ROWS, PAW_COLS);
			} else if (slot.type === "paw-off" || slot.id === "paw-off") {
				placeOnGrid(character.pawGrid, slot.item, PAW_ROWS, PAW_COLS);
			} else if (slot.type === "body") {
				placeOnGrid(character.bodyGrid, slot.item, BODY_ROWS, BODY_COLS);
			} else if (slot.type === "pack") {
				placeOnGrid(character.packGrid, slot.item, PACK_ROWS, PACK_COLS);
			}
		}
		delete (character as any).inventory;
	}
}
