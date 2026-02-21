import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { HexMap, HexTerrain, MapHex, MapSettlement, NPC } from "../types/generator";
import { generateHexMap, generateMapSettlement, generateNPC } from "../engine/hexmap";
import { div, button, span, el } from "../utils/dom-helpers";

// Flat-top hex diamond layout matching Mausritter rulebook
// 5 columns: col 0 (3 hexes), col 1 (4), col 2 (5), col 3 (4), col 4 (3)
// Odd columns offset down by H/2
//
// Rulebook (1-indexed) → code (0-indexed):
//            [8]                        [7]
//         [19] [9]                   [18] [8]
//       [18] [2] [10]             [17] [1] [9]
//         [7] [3]                   [6] [2]
//       [17] [1] [11]            [16] [0] [10]
//         [6] [4]                   [5] [3]
//       [16] [5] [12]            [15] [4] [11]
//         [15] [13]                [14] [12]
//            [14]                     [13]

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

		// Read-only display
		this.renderHexFields(panel, hex);
	}

	renderHexDetail(panel: HTMLElement, hex: MapHex): void {
		panel.appendChild(div("mausritter-hexmap-detail-title", [
			`Hex ${hex.id}: ${hex.name}`
		]));
		this.renderHexFields(panel, hex);
	}

	private renderHexFields(panel: HTMLElement, hex: MapHex): void {
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
			this.renderSettlementDetail(panel, hex.settlement);
		}

		// Hex-level NPCs (outside settlements)
		const hexNpcs = hex.npcs ?? [];
		if (hexNpcs.length) {
			panel.appendChild(div("mausritter-subtitle", ["NPCs"]));
			for (const npc of hexNpcs) {
				panel.appendChild(this.renderNPCCard(npc));
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
				// Manually re-render in read-only mode since Obsidian
				// may not re-trigger the block processor after persistState.
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
				for (let i = 0; i < hex.settlement.npcs.length; i++) {
					const npcIdx = i;
					panel.appendChild(this.renderNPCEditCard(
						hex.settlement.npcs[npcIdx],
						state,
						() => {
							hex.settlement!.npcs.splice(npcIdx, 1);
							this.renderEditMode(panel, state, updateState);
						},
						(targetHexId: number) => {
							const npc = hex.settlement!.npcs.splice(npcIdx, 1)[0];
							this.moveNPCToHex(state, npc, targetHexId);
							this.renderEditMode(panel, state, updateState);
						},
					));
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
		for (let i = 0; i < hex.npcs.length; i++) {
			const npcIdx = i;
			panel.appendChild(this.renderNPCEditCard(
				hex.npcs[npcIdx],
				state,
				() => {
					hex.npcs.splice(npcIdx, 1);
					this.renderEditMode(panel, state, updateState);
				},
				(targetHexId: number) => {
					const npc = hex.npcs.splice(npcIdx, 1)[0];
					this.moveNPCToHex(state, npc, targetHexId);
					this.renderEditMode(panel, state, updateState);
				},
			));
		}

		panel.appendChild(
			button("Add NPC", () => {
				hex.npcs.push(generateNPC(hex.id));
				this.renderEditMode(panel, state, updateState);
			}, "mausritter-btn mausritter-btn-small")
		);
	}

	private renderNPCEditCard(
		npc: NPC,
		state: HexMap,
		onRemove: () => void,
		onMove: (targetHexId: number) => void,
	): HTMLElement {
		const card = div("mausritter-npc-card mausritter-npc-card-edit");

		// Header with name
		card.appendChild(div("mausritter-npc-edit-header", [
			span("mausritter-npc-name", `${npc.name} ${npc.lastName ?? ""}`)
		]));

		// Editable fields
		card.appendChild(this.editField("First Name", npc.name, (v) => { npc.name = v; }));
		card.appendChild(this.editField("Last Name", npc.lastName ?? "", (v) => { npc.lastName = v; }));
		card.appendChild(this.editField("Social Position", npc.socialPosition ?? "", (v) => { npc.socialPosition = v; }));
		card.appendChild(this.editField("Birthsign", npc.birthsign ?? "", (v) => { npc.birthsign = v; }));
		card.appendChild(this.editField("Disposition", npc.disposition ?? "", (v) => { npc.disposition = v; }));
		card.appendChild(this.editField("Appearance", npc.appearance ?? "", (v) => { npc.appearance = v; }));
		card.appendChild(this.editField("Quirk", npc.quirk ?? "", (v) => { npc.quirk = v; }));
		card.appendChild(this.editField("Wants", npc.want, (v) => { npc.want = v; }));
		card.appendChild(this.editField("Relationship", npc.relationship ?? "", (v) => { npc.relationship = v; }));

		// Stats row
		const statsRow = div("mausritter-npc-edit-stats");
		for (const stat of ["hp", "str", "dex", "wil"] as const) {
			const statEl = div("mausritter-npc-edit-stat");
			statEl.appendChild(span("mausritter-label", `${stat.toUpperCase()}: `));
			const input = el("input", {
				class: "mausritter-npc-stat-input",
				type: "number",
				value: String(npc[stat] ?? 0),
			}) as HTMLInputElement;
			input.addEventListener("input", () => {
				(npc as any)[stat] = parseInt(input.value) || 0;
			});
			statEl.appendChild(input);
			statsRow.appendChild(statEl);
		}
		card.appendChild(statsRow);

		// Items
		card.appendChild(this.editField("Items", (npc.items ?? []).join(", "), (v) => {
			npc.items = v.split(",").map(s => s.trim()).filter(Boolean);
		}));

		// Actions: Move to hex + Remove
		const actions = div("mausritter-npc-actions");

		// Move dropdown
		const moveRow = div("mausritter-npc-move");
		moveRow.appendChild(span("mausritter-label", "Move to hex: "));
		const select = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		select.appendChild(el("option", { value: "-1" }, ["—"]));
		for (let i = 0; i < state.hexes.length; i++) {
			const h = state.hexes[i];
			if (i === state.selectedHex) continue;
			const label = h.settlement ? `${i}: ${h.settlement.name}` : `${i}: ${h.name}`;
			select.appendChild(el("option", { value: String(i) }, [label]));
		}
		moveRow.appendChild(select);
		moveRow.appendChild(
			button("Move", () => {
				const target = parseInt(select.value);
				if (target >= 0) onMove(target);
			}, "mausritter-btn mausritter-btn-small")
		);
		actions.appendChild(moveRow);

		actions.appendChild(
			button("Remove NPC", onRemove, "mausritter-btn mausritter-btn-small mausritter-btn-danger")
		);
		card.appendChild(actions);

		return card;
	}

	private moveNPCToHex(state: HexMap, npc: NPC, targetHexId: number): void {
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

	private renderSettlementDetail(panel: HTMLElement, s: MapSettlement): void {
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

		if (s.npcs.length) {
			panel.appendChild(div("mausritter-subtitle", ["NPCs"]));
			for (const npc of s.npcs) {
				panel.appendChild(this.renderNPCCard(npc));
			}
		}
	}

	private renderNPCCard(npc: NPC): HTMLElement {
		const card = div("mausritter-npc-card");

		// Header: name + stats
		const header = div("mausritter-npc-header");
		header.appendChild(span("mausritter-npc-name", `${npc.name} ${npc.lastName ?? ""}`));
		header.appendChild(span("mausritter-npc-position", npc.socialPosition ?? ""));
		card.appendChild(header);

		// Stats row
		if (npc.hp !== undefined) {
			const stats = div("mausritter-npc-stats");
			stats.appendChild(span("mausritter-npc-stat", `HP ${npc.hp}`));
			stats.appendChild(span("mausritter-npc-stat", `STR ${npc.str}`));
			stats.appendChild(span("mausritter-npc-stat", `DEX ${npc.dex}`));
			stats.appendChild(span("mausritter-npc-stat", `WIL ${npc.wil}`));
			card.appendChild(stats);
		}

		// Birthsign
		if (npc.birthsign) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Birthsign: "),
				span("", `${npc.birthsign} (${npc.disposition})`),
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
		card.appendChild(div("mausritter-npc-field", [
			span("mausritter-label", "Wants: "),
			span("", npc.want),
		]));

		// Relationship
		if (npc.relationship) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Relationship: "),
				span("", npc.relationship),
			]));
		}

		// Items
		if (npc.items?.length) {
			card.appendChild(div("mausritter-npc-field", [
				span("mausritter-label", "Carrying: "),
				span("", npc.items.join(", ")),
			]));
		}

		return card;
	}
}
