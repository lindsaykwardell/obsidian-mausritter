import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { HexMap, HexTerrain, MapHex, MapSettlement } from "../types/generator";
import { Character, Item } from "../types/character";
import { generateHexMap, generateMapSettlement, generateNPC, migrateHexMapNpcs } from "../engine/hexmap";
import { rollSave, StatName } from "../engine/saves";
import { canLevelUp, levelUp } from "../engine/advancement";
import { renderInventoryPanel, renderAddItemPanel, renderLog } from "./inventory-panel";
import { findAllEntitySheets, findPartyHex, giveItemToEntity, EntitySheetRef } from "../engine/vault-scanner";
import { div, button, span, el } from "../utils/dom-helpers";

// Flat-top hex diamond layout matching Mausritter rulebook
const HEX_W = 92;
const HEX_H = 80;
const COL_STEP = 69;  // W * 3/4
const ROW_STEP = 80;  // H
const HALF_ROW = 40;  // H / 2

const HEX_POSITIONS: [number, number][] = [
	[2 * COL_STEP, 2 * ROW_STEP],              // 0  - center (col 2, row 2)
	[2 * COL_STEP, 1 * ROW_STEP],              // 1  (col 2, row 1)
	[3 * COL_STEP, 1 * ROW_STEP + HALF_ROW],   // 2  (col 3, row 1+offset)
	[3 * COL_STEP, 2 * ROW_STEP + HALF_ROW],   // 3  (col 3, row 2+offset)
	[2 * COL_STEP, 3 * ROW_STEP],              // 4  (col 2, row 3)
	[1 * COL_STEP, 2 * ROW_STEP + HALF_ROW],   // 5  (col 1, row 2+offset)
	[1 * COL_STEP, 1 * ROW_STEP + HALF_ROW],   // 6  (col 1, row 1+offset)
	[2 * COL_STEP, 0],                          // 7  - top (col 2, row 0)
	[3 * COL_STEP, HALF_ROW],                   // 8  (col 3, row 0+offset)
	[4 * COL_STEP, 1 * ROW_STEP],              // 9  (col 4, row 1)
	[4 * COL_STEP, 2 * ROW_STEP],              // 10 (col 4, row 2)
	[4 * COL_STEP, 3 * ROW_STEP],              // 11 (col 4, row 3)
	[3 * COL_STEP, 3 * ROW_STEP + HALF_ROW],   // 12 (col 3, row 3+offset)
	[2 * COL_STEP, 4 * ROW_STEP],              // 13 - bottom (col 2, row 4)
	[1 * COL_STEP, 3 * ROW_STEP + HALF_ROW],   // 14 (col 1, row 3+offset)
	[0, 3 * ROW_STEP],                          // 15 (col 0, row 3)
	[0, 2 * ROW_STEP],                          // 16 (col 0, row 2)
	[0, 1 * ROW_STEP],                          // 17 (col 0, row 1)
	[1 * COL_STEP, HALF_ROW],                   // 18 (col 1, row 0+offset)
];

const GRID_W = 4 * COL_STEP + HEX_W;   // 368
const GRID_H = 4 * ROW_STEP + HEX_H;   // 400

const TERRAIN_CLASSES: Record<string, string> = {
	countryside: "mausritter-hex-countryside",
	forest: "mausritter-hex-forest",
	river: "mausritter-hex-river",
	"human town": "mausritter-hex-human-town",
};

const TERRAIN_OPTIONS: HexTerrain[] = ["countryside", "forest", "river", "human town"];

const NPC_PACK_ROWS = 1;
const NPC_PACK_COLS = 2;

function capitalize(s: string): string {
	return s.charAt(0).toUpperCase() + s.slice(1);
}

export class HexMapRenderer extends BaseRenderer<HexMap> {
	protected blockType = "mausritter-hexmap";

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: HexMap | null,
		updateState: (data: HexMap) => void
	): void {
		container.addClass("mausritter-hexmap");
		container.appendChild(div("mausritter-title", ["Hex Map"]));

		if (!data || !data.hexes?.length) {
			this.renderEmpty(container, updateState);
			return;
		}

		const state = data;
		// Migrate older data missing partyHex
		if (state.partyHex === undefined) state.partyHex = -1;

		// Migrate old-format NPCs to full Character objects
		if (migrateHexMapNpcs(state)) {
			updateState(state);
		}

		// Map name
		const nameRow = div("mausritter-hexmap-name-row");
		const nameInput = el("input", {
			class: "mausritter-hexmap-name-input",
			type: "text",
			value: state.name,
		}) as HTMLInputElement;
		nameInput.addEventListener("change", () => {
			state.name = nameInput.value;
			updateState(state);
		});
		nameRow.appendChild(nameInput);
		nameRow.appendChild(
			button("Regenerate", () => {
				const newMap = generateHexMap(state.name);
				updateState(newMap);
			}, "mausritter-btn")
		);
		container.appendChild(nameRow);

		// Hex grid
		const grid = div("mausritter-hexmap-grid");
		this.renderGrid(grid, state, updateState);
		container.appendChild(grid);

		// Detail panel
		if (state.selectedHex >= 0 && state.selectedHex < state.hexes.length) {
			const detailPanel = div("mausritter-hexmap-detail");
			this.renderHexDetailEditable(detailPanel, state, updateState);
			container.appendChild(detailPanel);
		}
	}

	private renderEmpty(container: HTMLElement, updateState: (data: HexMap) => void): void {
		const empty = div("mausritter-hexmap-empty", [
			"No hex map generated yet.",
		]);
		container.appendChild(empty);
		container.appendChild(
			button("Generate Map", () => {
				updateState(generateHexMap());
			}, "mausritter-btn mausritter-btn-primary")
		);
	}

	private renderGrid(grid: HTMLElement, state: HexMap, updateState: (data: HexMap) => void): void {
		grid.style.width = `${GRID_W}px`;
		grid.style.height = `${GRID_H}px`;

		for (let i = 0; i < 19; i++) {
			const hex = state.hexes[i];
			const [left, top] = HEX_POSITIONS[i];

			const hexEl = document.createElement("div");
			hexEl.className = `mausritter-hex-cell ${TERRAIN_CLASSES[hex.terrain] ?? ""}`;
			if (i === state.selectedHex) {
				hexEl.classList.add("mausritter-hex-selected");
			}
			hexEl.style.left = `${left}px`;
			hexEl.style.top = `${top}px`;
			hexEl.style.width = `${HEX_W}px`;
			hexEl.style.height = `${HEX_H}px`;
			hexEl.style.zIndex = "1";

			// Settlement indicator
			if (hex.settlement) {
				hexEl.classList.add("mausritter-hex-has-settlement");
			}

			// Party marker
			if (i === state.partyHex) {
				hexEl.classList.add("mausritter-hex-party");
			}

			// Label
			const label = document.createElement("div");
			label.className = "mausritter-hex-label";
			const displayName = hex.settlement ? hex.settlement.name : hex.name;
			const truncated = displayName.length > 10 ? displayName.slice(0, 9) + "\u2026" : displayName;
			label.textContent = truncated;
			hexEl.appendChild(label);

			const idLabel = document.createElement("div");
			idLabel.className = "mausritter-hex-id";
			idLabel.textContent = `${i}`;
			hexEl.appendChild(idLabel);

			hexEl.addEventListener("click", () => {
				state.selectedHex = state.selectedHex === i ? -1 : i;
				updateState(state);
			});

			grid.appendChild(hexEl);
		}
	}

	private renderHexDetailEditable(
		panel: HTMLElement,
		state: HexMap,
		updateState: (data: HexMap) => void
	): void {
		const hex = state.hexes[state.selectedHex];

		// Title row with edit toggle
		const titleRow = div("mausritter-hexmap-detail-header");
		titleRow.appendChild(div("mausritter-hexmap-detail-title", [
			`Hex ${hex.id}: ${hex.name}`
		]));

		const actions = div("mausritter-hexmap-detail-actions");

		// Party location button
		if (state.partyHex === state.selectedHex) {
			actions.appendChild(
				button("Party is here", () => {
					state.partyHex = -1;
					updateState(state);
				}, "mausritter-btn mausritter-btn-small mausritter-btn-active")
			);
		} else {
			actions.appendChild(
				button("Move party here", () => {
					state.partyHex = state.selectedHex;
					updateState(state);
				}, "mausritter-btn mausritter-btn-small")
			);
		}

		// Edit button
		actions.appendChild(
			button("Edit", () => {
				this.renderEditMode(panel, state, updateState);
			}, "mausritter-btn mausritter-btn-small")
		);

		titleRow.appendChild(actions);
		panel.appendChild(titleRow);

		// Read-only display with inline NPC edit buttons
		this.renderHexFields(panel, hex, state, updateState);
	}

	renderHexDetail(panel: HTMLElement, hex: MapHex): void {
		panel.appendChild(div("mausritter-hexmap-detail-title", [
			`Hex ${hex.id}: ${hex.name}`
		]));
		this.renderHexFields(panel, hex);
	}

	private renderHexFields(
		panel: HTMLElement,
		hex: MapHex,
		state?: HexMap,
		updateState?: (data: HexMap) => void
	): void {
		panel.appendChild(div("mausritter-hexmap-detail-field", [
			span("mausritter-label", "Terrain: "),
			span("", capitalize(hex.terrain)),
		]));

		panel.appendChild(div("mausritter-hexmap-detail-field", [
			span("mausritter-label", "Landmark: "),
			span("", hex.landmark),
		]));

		if (hex.description) {
			panel.appendChild(div("mausritter-hexmap-detail-field", [
				span("mausritter-label", "Feature: "),
				span("", hex.description),
			]));
		}

		if (hex.settlement) {
			this.renderSettlementDetail(panel, hex.settlement, state, updateState);
		}

		// Hex-level NPCs (outside settlements)
		const hexNpcs = hex.npcs ?? [];
		if (hexNpcs.length) {
			panel.appendChild(div("mausritter-subtitle", ["NPCs"]));
			for (const npc of hexNpcs) {
				this.appendNPCCardWithEdit(panel, npc, state, updateState);
			}
		}
	}

	private renderEditMode(
		panel: HTMLElement,
		state: HexMap,
		updateState: (data: HexMap) => void
	): void {
		const hex = state.hexes[state.selectedHex];

		// Clear and re-render in edit mode
		panel.empty();

		const titleRow = div("mausritter-hexmap-detail-header");
		titleRow.appendChild(div("mausritter-hexmap-detail-title", [`Edit Hex ${hex.id}`]));
		const actions = div("mausritter-hexmap-detail-actions");
		actions.appendChild(
			button("Done", () => {
				updateState(state);
				panel.empty();
				this.renderHexDetailEditable(panel, state, updateState);
			}, "mausritter-btn mausritter-btn-small mausritter-btn-primary")
		);
		titleRow.appendChild(actions);
		panel.appendChild(titleRow);

		// Name
		panel.appendChild(this.editField("Name", hex.name, (v) => { hex.name = v; }));

		// Terrain
		const terrainRow = div("mausritter-hexmap-edit-row");
		terrainRow.appendChild(span("mausritter-label", "Terrain: "));
		const terrainSelect = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		for (const t of TERRAIN_OPTIONS) {
			const opt = el("option", { value: t }, [capitalize(t)]);
			if (t === hex.terrain) (opt as HTMLOptionElement).selected = true;
			terrainSelect.appendChild(opt);
		}
		terrainSelect.addEventListener("change", () => {
			hex.terrain = terrainSelect.value as HexTerrain;
		});
		terrainRow.appendChild(terrainSelect);
		panel.appendChild(terrainRow);

		// Landmark
		panel.appendChild(this.editField("Landmark", hex.landmark, (v) => { hex.landmark = v; }));

		// Description
		panel.appendChild(this.editField("Feature", hex.description, (v) => { hex.description = v; }));

		// Settlement toggle
		if (hex.settlement) {
			panel.appendChild(div("mausritter-subtitle", ["Settlement"]));
			panel.appendChild(this.editField("Name", hex.settlement.name, (v) => { hex.settlement!.name = v; }));
			panel.appendChild(this.editField("Governance", hex.settlement.governance, (v) => { hex.settlement!.governance = v; }));
			panel.appendChild(this.editField("Disposition", hex.settlement.detail, (v) => { hex.settlement!.detail = v; }));
			panel.appendChild(this.editField("Features", hex.settlement.features.join(", "), (v) => { hex.settlement!.features = v.split(",").map(s => s.trim()).filter(Boolean); }));
			panel.appendChild(this.editField("Industry", hex.settlement.industries.join(", "), (v) => { hex.settlement!.industries = v.split(",").map(s => s.trim()).filter(Boolean); }));
			panel.appendChild(this.editField("Event", hex.settlement.event, (v) => { hex.settlement!.event = v; }));

			// Settlement NPCs
			if (hex.settlement.npcs.length) {
				panel.appendChild(div("mausritter-subtitle", ["Settlement NPCs"]));
				for (const npc of hex.settlement.npcs) {
					this.appendNPCCardWithEdit(panel, npc, state, updateState);
				}
			}

			panel.appendChild(
				button("Add settlement NPC", () => {
					hex.settlement!.npcs.push(generateNPC(hex.id));
					this.renderEditMode(panel, state, updateState);
				}, "mausritter-btn mausritter-btn-small")
			);

			panel.appendChild(
				button("Remove settlement", () => {
					hex.settlement = null;
					this.renderEditMode(panel, state, updateState);
				}, "mausritter-btn mausritter-btn-small mausritter-btn-danger")
			);
		} else {
			panel.appendChild(
				button("Add settlement", () => {
					hex.settlement = generateMapSettlement();
					hex.name = hex.settlement.name;
					this.renderEditMode(panel, state, updateState);
				}, "mausritter-btn mausritter-btn-small")
			);
		}

		// Hex-level NPCs (outside settlement)
		if (!hex.npcs) hex.npcs = [];
		panel.appendChild(div("mausritter-subtitle", ["NPCs"]));
		for (const npc of hex.npcs) {
			this.appendNPCCardWithEdit(panel, npc, state, updateState);
		}

		panel.appendChild(
			button("Add NPC", () => {
				hex.npcs.push(generateNPC(hex.id));
				this.renderEditMode(panel, state, updateState);
			}, "mausritter-btn mausritter-btn-small")
		);
	}

	private renderNPCEditCard(
		npc: Character,
		state: HexMap,
		updateState: (data: HexMap) => void,
		headerActions?: HTMLElement,
	): HTMLElement {
		const card = div("mausritter-npc-card mausritter-npc-card-edit");

		// Header with Done + Move actions
		if (headerActions) {
			const header = div("mausritter-npc-header");
			header.appendChild(span("mausritter-npc-name", npc.name));
			header.appendChild(span("mausritter-npc-position", npc.socialPosition ?? ""));
			header.appendChild(headerActions);
			card.appendChild(header);
		}

		// Helper to create an NPC-level update callback
		const npcUpdate = (ch: Character) => {
			// npc is a reference within state, so just persist the parent hexmap
			updateState(state);
		};

		// Name + lastName + species inputs
		card.appendChild(this.editField("Name", npc.name, (v) => { npc.name = v; }));
		card.appendChild(this.editField("Last Name", npc.lastName ?? "", (v) => { npc.lastName = v; }));
		card.appendChild(this.editField("Species", npc.species ?? "Mouse", (v) => { npc.species = v.trim() || "Mouse"; }));

		// Personality fields
		card.appendChild(this.editField("Social Position", npc.socialPosition ?? "", (v) => { npc.socialPosition = v; }));
		card.appendChild(this.editField("Birthsign", npc.birthsign ?? "", (v) => { npc.birthsign = v; }));
		card.appendChild(this.editField("Disposition", npc.disposition ?? "", (v) => { npc.disposition = v; }));
		card.appendChild(this.editField("Appearance", npc.appearance ?? "", (v) => { npc.appearance = v; }));
		card.appendChild(this.editField("Quirk", npc.quirk ?? "", (v) => { npc.quirk = v; }));
		card.appendChild(this.editField("Wants", npc.want ?? "", (v) => { npc.want = v; }));
		card.appendChild(this.editField("Relationship", npc.relationship ?? "", (v) => { npc.relationship = v; }));

		// Stats row (current/max inputs with Save buttons)
		const statsRow = div("mausritter-stats-row");
		for (const statName of ["str", "dex", "wil"] as StatName[]) {
			statsRow.appendChild(this.renderStatEditor(statName, npc, npcUpdate));
		}
		card.appendChild(statsRow);

		// HP, Pips row
		const resourceRow = div("mausritter-resource-row");
		resourceRow.appendChild(this.renderHpEditor(npc, npcUpdate));
		resourceRow.appendChild(this.renderPipsEditor(npc, npcUpdate));
		card.appendChild(resourceRow);

		// Level Up button
		if (canLevelUp(npc)) {
			card.appendChild(
				button("Level Up!", () => {
					const result = levelUp(npc);
					if (result) {
						npc.log.push(...result.log);
						updateState(state);
					}
				}, "mausritter-btn mausritter-btn-primary mausritter-btn-tiny")
			);
		}

		// Ensure arrays exist
		if (!npc.ground) npc.ground = [];
		if (!npc.pawGrid) npc.pawGrid = [];
		if (!npc.bodyGrid) npc.bodyGrid = [];
		if (!npc.packGrid) npc.packGrid = [];
		if (!npc.log) npc.log = [];

		// Full inventory panel
		renderInventoryPanel(card, npc, npcUpdate, this.plugin, {
			packRows: NPC_PACK_ROWS,
			packCols: NPC_PACK_COLS,
			scopeId: npc.id,
		});

		// Add item — collapsible
		const addItemDetails = document.createElement("details");
		addItemDetails.className = "mausritter-collapsible";
		const addItemSummary = document.createElement("summary");
		addItemSummary.className = "mausritter-collapsible-summary";
		addItemSummary.textContent = "Add Item / Condition";
		addItemDetails.appendChild(addItemSummary);
		addItemDetails.appendChild(renderAddItemPanel(npc, npcUpdate, NPC_PACK_ROWS, NPC_PACK_COLS));
		card.appendChild(addItemDetails);

		// Action log — collapsible
		const logDetails = document.createElement("details");
		logDetails.className = "mausritter-collapsible";
		const logSummary = document.createElement("summary");
		logSummary.className = "mausritter-collapsible-summary";
		logSummary.textContent = "Action Log";
		logDetails.appendChild(logSummary);
		logDetails.appendChild(renderLog(npc));
		card.appendChild(logDetails);

		return card;
	}

	private renderStatEditor(statName: StatName, npc: Character, updateState: (data: Character) => void): HTMLElement {
		const stat = npc[statName];
		const box = div("mausritter-stat-box");
		box.appendChild(div("mausritter-stat-label", [statName.toUpperCase()]));
		const values = div("mausritter-stat-values");

		const currentInput = el("input", { class: "mausritter-stat-input mausritter-stat-current", type: "number" }) as HTMLInputElement;
		currentInput.value = String(stat.current);
		currentInput.addEventListener("change", () => { stat.current = parseInt(currentInput.value) || 0; updateState(npc); });

		const maxInput = el("input", { class: "mausritter-stat-input", type: "number" }) as HTMLInputElement;
		maxInput.value = String(stat.max);
		maxInput.addEventListener("change", () => { stat.max = parseInt(maxInput.value) || 0; updateState(npc); });

		values.appendChild(currentInput);
		values.appendChild(span("mausritter-stat-slash", "/"));
		values.appendChild(maxInput);
		box.appendChild(values);

		box.appendChild(
			button("Save", () => {
				const result = rollSave(npc, statName);
				npc.log.push(
					`${statName.toUpperCase()} save: rolled ${result.roll} vs ${result.statValue} — ${result.success ? "Success!" : "Failure!"}`
				);
				updateState(npc);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-save")
		);

		return box;
	}

	private renderHpEditor(npc: Character, updateState: (data: Character) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["HP"]));
		const values = div("mausritter-stat-values");

		const currentInput = el("input", { class: "mausritter-stat-input mausritter-stat-current", type: "number" }) as HTMLInputElement;
		currentInput.value = String(npc.hp.current);
		currentInput.addEventListener("change", () => {
			npc.hp.current = Math.max(0, parseInt(currentInput.value) || 0);
			updateState(npc);
		});

		const maxInput = el("input", { class: "mausritter-stat-input", type: "number" }) as HTMLInputElement;
		maxInput.value = String(npc.hp.max);
		maxInput.addEventListener("change", () => {
			npc.hp.max = Math.max(1, parseInt(maxInput.value) || 1);
			updateState(npc);
		});

		values.appendChild(currentInput);
		values.appendChild(span("mausritter-stat-slash", "/"));
		values.appendChild(maxInput);
		box.appendChild(values);
		return box;
	}

	private renderPipsEditor(npc: Character, updateState: (data: Character) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["Pips"]));
		const pipsInput = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "number" }) as HTMLInputElement;
		pipsInput.value = String(npc.pips ?? 0);
		pipsInput.addEventListener("change", () => { npc.pips = parseInt(pipsInput.value) || 0; updateState(npc); });
		box.appendChild(pipsInput);
		return box;
	}

	private moveNPCToHex(state: HexMap, npc: Character, targetHexId: number): void {
		const targetHex = state.hexes[targetHexId];
		if (!targetHex) return;

		npc.hexId = targetHexId;

		if (!targetHex.npcs) targetHex.npcs = [];
		targetHex.npcs.push(npc);
	}

	private editField(
		label: string,
		value: string,
		onChange: (value: string) => void
	): HTMLElement {
		const row = div("mausritter-hexmap-edit-row");
		row.appendChild(span("mausritter-label", `${label}: `));
		const input = el("input", {
			class: "mausritter-hexmap-edit-input",
			type: "text",
			value: value ?? "",
		}) as HTMLInputElement;
		input.addEventListener("input", () => {
			onChange(input.value);
		});
		row.appendChild(input);
		return row;
	}

	private renderSettlementDetail(
		panel: HTMLElement,
		s: MapSettlement,
		state?: HexMap,
		updateState?: (data: HexMap) => void
	): void {
		panel.appendChild(div("mausritter-subtitle", ["Settlement"]));

		panel.appendChild(div("mausritter-hexmap-detail-field", [
			span("mausritter-label", "Name: "),
			span("", s.name),
		]));
		panel.appendChild(div("mausritter-hexmap-detail-field", [
			span("mausritter-label", "Size: "),
			span("", `${s.sizeLabel} (${s.size})`),
		]));
		panel.appendChild(div("mausritter-hexmap-detail-field", [
			span("mausritter-label", "Governance: "),
			span("", s.governance),
		]));
		panel.appendChild(div("mausritter-hexmap-detail-field", [
			span("mausritter-label", "Disposition: "),
			span("", s.detail),
		]));

		if (s.features.length) {
			panel.appendChild(div("mausritter-hexmap-detail-field", [
				span("mausritter-label", "Features: "),
				span("", s.features.join(", ")),
			]));
		}

		if (s.industries.length) {
			panel.appendChild(div("mausritter-hexmap-detail-field", [
				span("mausritter-label", "Industry: "),
				span("", s.industries.join(", ")),
			]));
		}

		panel.appendChild(div("mausritter-hexmap-detail-field", [
			span("mausritter-label", "Event: "),
			span("", s.event),
		]));

		if (s.taverns.length) {
			panel.appendChild(div("mausritter-subtitle", ["Taverns"]));
			for (const t of s.taverns) {
				panel.appendChild(div("mausritter-hexmap-detail-field", [
					span("mausritter-label", `${t.name}: `),
					span("", t.specialty),
				]));
			}
		}

		// Constructions and Bank (above NPCs)
		if (state && updateState) {
			this.renderConstructions(panel, s, state, updateState);
			this.renderBank(panel, s, state, updateState);
		}

		if (s.npcs.length) {
			panel.appendChild(div("mausritter-subtitle", ["NPCs"]));
			for (const npc of s.npcs) {
				this.appendNPCCardWithEdit(panel, npc, state, updateState);
			}
		}
	}

	private renderConstructions(
		panel: HTMLElement,
		s: MapSettlement,
		state: HexMap,
		updateState: (data: HexMap) => void
	): void {
		if (!s.constructions) s.constructions = [];

		panel.appendChild(div("mausritter-subtitle", ["Constructions"]));
		const section = div("mausritter-constructions");

		const constructionTypes: { type: string; costPerUnit: number }[] = [
			{ type: "Tunnel (per 6\")", costPerUnit: 10 },
			{ type: "Poor room (per 6\" cube)", costPerUnit: 100 },
			{ type: "Standard room (per 6\" cube)", costPerUnit: 500 },
			{ type: "Grand room (per 6\" cube)", costPerUnit: 2000 },
		];

		for (const c of s.constructions) {
			const row = div("mausritter-construction-row");
			row.appendChild(span("mausritter-construction-name", `${c.type}: ${c.count}`));
			row.appendChild(span("mausritter-construction-cost", `(${c.count * c.costPerUnit}p total, ${Math.floor(c.count * c.costPerUnit * 0.01)}p/month upkeep)`));

			row.appendChild(
				button("-", () => {
					c.count = Math.max(0, c.count - 1);
					if (c.count === 0) {
						s.constructions = s.constructions!.filter(x => x !== c);
					}
					updateState(state);
				}, "mausritter-btn mausritter-btn-tiny")
			);
			row.appendChild(
				button("+", () => {
					c.count++;
					updateState(state);
				}, "mausritter-btn mausritter-btn-tiny")
			);

			section.appendChild(row);
		}

		// Add dropdown
		const addRow = div("mausritter-construction-add");
		const select = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		for (const ct of constructionTypes) {
			select.appendChild(el("option", { value: ct.type }, [`${ct.type} (${ct.costPerUnit}p)`]));
		}
		addRow.appendChild(select);
		addRow.appendChild(
			button("Add", () => {
				const ct = constructionTypes.find(t => t.type === select.value);
				if (!ct) return;
				const existing = s.constructions!.find(c => c.type === ct.type);
				if (existing) {
					existing.count++;
				} else {
					s.constructions!.push({ type: ct.type, count: 1, costPerUnit: ct.costPerUnit });
				}
				updateState(state);
			}, "mausritter-btn mausritter-btn-small")
		);
		section.appendChild(addRow);

		panel.appendChild(section);
	}

	private renderBank(
		panel: HTMLElement,
		s: MapSettlement,
		state: HexMap,
		updateState: (data: HexMap) => void
	): void {
		if (!s.bank) s.bank = { pips: 0, items: [] };

		panel.appendChild(div("mausritter-subtitle", ["Bank"]));
		const section = div("mausritter-bank");

		// Pips
		const pipsRow = div("mausritter-bank-pips-row");
		pipsRow.appendChild(span("mausritter-label", "Stored Pips: "));
		const pipsInput = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "number" }) as HTMLInputElement;
		pipsInput.value = String(s.bank.pips);
		pipsInput.addEventListener("change", () => {
			s.bank!.pips = Math.max(0, parseInt(pipsInput.value) || 0);
			updateState(state);
		});
		pipsRow.appendChild(pipsInput);
		pipsRow.appendChild(span("mausritter-bank-fee-hint", "(1% fee on withdrawal)"));
		section.appendChild(pipsRow);

		// Items rendered as item cards
		if (s.bank.items.length > 0) {
			const itemsList = div("mausritter-bank-items");
			itemsList.appendChild(span("mausritter-label", "Stored Items:"));
			for (let i = 0; i < s.bank.items.length; i++) {
				const item = s.bank.items[i];
				const cardWrapper = div("mausritter-bank-item-card");
				cardWrapper.appendChild(this.renderBankItemCard(item, i, s, state, updateState));
				itemsList.appendChild(cardWrapper);
			}
			section.appendChild(itemsList);
		} else {
			section.appendChild(div("mausritter-bank-empty-hint", [
				"No items stored. Use the \u2192 (give) button on items to deposit."
			]));
		}

		panel.appendChild(section);
	}

	private renderBankItemCard(
		item: Item,
		index: number,
		s: MapSettlement,
		state: HexMap,
		updateState: (data: HexMap) => void
	): HTMLElement {
		const isCondition = item.type === "condition";
		const itemEl = div(
			`mausritter-item ${isCondition ? "mausritter-item-condition" : `mausritter-item-${item.type}`}`
		);

		// Top-right info
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
			for (let d = 0; d < item.usage.total; d++) {
				usageEl.appendChild(span(
					d < item.usage.used ? "mausritter-usage-dot mausritter-usage-used" : "mausritter-usage-dot"
				));
			}
			itemEl.appendChild(usageEl);
		}

		const btnRow = div("mausritter-item-actions");

		// Give to button — opens dropdown of characters/hirelings
		const giveBtn = button("\u2192", () => {
			this.showBankGiveDropdown(giveBtn, item, index, s, state, updateState);
		}, "mausritter-btn mausritter-btn-tiny mausritter-btn-give");
		btnRow.appendChild(giveBtn);

		// Delete from bank
		btnRow.appendChild(
			button("\u2715", () => {
				s.bank!.items.splice(index, 1);
				updateState(state);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-delete")
		);

		itemEl.appendChild(btnRow);
		return itemEl;
	}

	private showBankGiveDropdown(
		anchor: HTMLElement,
		item: Item,
		index: number,
		s: MapSettlement,
		state: HexMap,
		updateState: (data: HexMap) => void
	): void {
		const existing = document.querySelector(".mausritter-give-dropdown");
		if (existing) existing.remove();

		Promise.all([findAllEntitySheets(this.plugin), findPartyHex(this.plugin)]).then(([sheets, partyHex]) => {
			// Only show characters and hirelings (not NPCs unless at same hex)
			const filtered = sheets.filter(sheet => {
				if (sheet.entityType === "npc") {
					return sheet.hexId != null && sheet.hexId >= 0 && sheet.hexId === partyHex;
				}
				return true;
			});

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
						s.bank!.items.splice(index, 1);
						updateState(state);
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

	/** Append an NPC card to the panel. If state/updateState are provided, includes Edit/Move/Done controls. */
	private appendNPCCardWithEdit(
		panel: HTMLElement,
		npc: Character,
		state?: HexMap,
		updateState?: (data: HexMap) => void
	): void {
		if (!state || !updateState) {
			panel.appendChild(this.renderNPCCard(npc));
			return;
		}

		const wrapper = div("mausritter-npc-card-wrapper");

		// Find which hex/settlement array this NPC belongs to
		const findNpcLocation = () => {
			for (const hex of state.hexes) {
				if (hex.npcs) {
					const idx = hex.npcs.indexOf(npc);
					if (idx >= 0) return { array: hex.npcs, idx };
				}
				if (hex.settlement?.npcs) {
					const idx = hex.settlement.npcs.indexOf(npc);
					if (idx >= 0) return { array: hex.settlement.npcs, idx };
				}
			}
			return null;
		};

		const showMoveDropdown = (anchor: HTMLElement) => {
			const existing = document.querySelector(".mausritter-give-dropdown");
			if (existing) existing.remove();

			const dropdown = div("mausritter-give-dropdown");
			const rect = anchor.getBoundingClientRect();
			dropdown.style.top = `${rect.bottom + window.scrollY}px`;
			dropdown.style.left = `${rect.left + window.scrollX}px`;

			for (let i = 0; i < state.hexes.length; i++) {
				if (i === state.selectedHex) continue;
				const h = state.hexes[i];
				const label = h.settlement ? `${i}: ${h.settlement.name}` : `${i}: ${h.name}`;
				const option = button(label, () => {
					const loc = findNpcLocation();
					if (loc) {
						const moved = loc.array.splice(loc.idx, 1)[0];
						this.moveNPCToHex(state, moved, i);
					}
					wrapper.empty();
					wrapper.appendChild(span("mausritter-npc-moved", `${npc.name} moved to hex ${i}`));
					updateState(state);
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
		};

		const isEditing = () => state.editingNpcs?.includes(npc.id) ?? false;

		const setEditing = (editing: boolean) => {
			if (!state.editingNpcs) state.editingNpcs = [];
			if (editing && !state.editingNpcs.includes(npc.id)) {
				state.editingNpcs.push(npc.id);
			} else if (!editing) {
				state.editingNpcs = state.editingNpcs.filter(id => id !== npc.id);
			}
		};

		const renderCard = () => {
			wrapper.empty();
			if (isEditing()) {
				const actions = div("mausritter-npc-header-actions");
				actions.appendChild(
					button("Done", () => {
						setEditing(false);
						updateState(state);
					}, "mausritter-btn mausritter-btn-small mausritter-btn-primary")
				);
				actions.appendChild(
					button("Remove", () => {
						setEditing(false);
						const loc = findNpcLocation();
						if (loc) loc.array.splice(loc.idx, 1);
						wrapper.remove();
						updateState(state);
					}, "mausritter-btn mausritter-btn-small mausritter-btn-danger")
				);
				const editCard = this.renderNPCEditCard(npc, state, updateState, actions);
				wrapper.appendChild(editCard);
			} else {
				const actions = div("mausritter-npc-header-actions");
				actions.appendChild(button("Edit", () => {
					setEditing(true);
					updateState(state);
				}, "mausritter-btn mausritter-btn-small"));
				const moveBtn = button("Move", () => showMoveDropdown(moveBtn), "mausritter-btn mausritter-btn-small");
				actions.appendChild(moveBtn);
				const card = this.renderNPCCard(npc, actions);
				wrapper.appendChild(card);
			}
		};

		renderCard();
		panel.appendChild(wrapper);
	}

	private renderNPCCard(
		npc: Character,
		headerActions?: HTMLElement,
	): HTMLElement {
		const card = div("mausritter-npc-card");

		// Header: name + social position + optional action buttons
		const header = div("mausritter-npc-header");
		header.appendChild(span("mausritter-npc-name", npc.name));
		header.appendChild(span("mausritter-npc-position", npc.socialPosition ?? ""));
		if (headerActions) header.appendChild(headerActions);
		card.appendChild(header);

		// Stats row (current/max)
		const stats = div("mausritter-npc-stats");
		stats.appendChild(span("mausritter-npc-stat", `HP ${npc.hp.current}/${npc.hp.max}`));
		stats.appendChild(span("mausritter-npc-stat", `STR ${npc.str.current}/${npc.str.max}`));
		stats.appendChild(span("mausritter-npc-stat", `DEX ${npc.dex.current}/${npc.dex.max}`));
		stats.appendChild(span("mausritter-npc-stat", `WIL ${npc.wil.current}/${npc.wil.max}`));
		card.appendChild(stats);

		// Birthsign
		if (npc.birthsign) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Birthsign: "),
				span("", `${npc.birthsign}${npc.disposition ? ` (${npc.disposition})` : ""}`),
			]));
		}

		// Appearance
		if (npc.appearance) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Appearance: "),
				span("", npc.appearance),
			]));
		}

		// Quirk
		if (npc.quirk) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Quirk: "),
				span("", npc.quirk),
			]));
		}

		// Want
		if (npc.want) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Wants: "),
				span("", npc.want),
			]));
		}

		// Relationship
		if (npc.relationship) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Relationship: "),
				span("", npc.relationship),
			]));
		}

		// Ground items summary
		if (npc.ground?.length) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Carrying: "),
				span("", npc.ground.map(i => i.name).join(", ")),
			]));
		}

		// Grid items summary
		const allGridItems = [...(npc.pawGrid ?? []), ...(npc.bodyGrid ?? []), ...(npc.packGrid ?? [])];
		if (allGridItems.length) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Equipped: "),
				span("", allGridItems.map(gi => gi.item.name).join(", ")),
			]));
		}

		return card;
	}
}
