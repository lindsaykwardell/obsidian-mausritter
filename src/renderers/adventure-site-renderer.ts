import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { AdventureSite, AdventureSiteRoom } from "../types/generator";
import { generateAdventureSite } from "../engine/adventure-site";
import { div, button, span, el } from "../utils/dom-helpers";

const ROOM_TYPES = ["Empty", "Obstacle", "Trap", "Puzzle", "Lair"];

const PARTY_COLORS = [
	"hsl(0, 70%, 50%)",     // red
	"hsl(220, 70%, 50%)",   // blue
	"hsl(130, 60%, 40%)",   // green
	"hsl(45, 90%, 50%)",    // gold
	"hsl(280, 60%, 55%)",   // purple
	"hsl(20, 80%, 50%)",    // orange
];

export class AdventureSiteRenderer extends BaseRenderer<AdventureSite> {
	protected blockType = "mausritter-adventure-site";
	private editing = false;

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: AdventureSite | null,
		updateState: (data: AdventureSite) => void
	): void {
		container.addClass("mausritter-adventure-site");

		if (!data || !data.name) {
			this.renderEmpty(container, updateState);
			return;
		}

		// Migrate old data without grid positions
		if (data.gridRows === undefined) {
			const fresh = generateAdventureSite();
			Object.assign(data, fresh);
			updateState(data);
			return;
		}
		if (!data.partyMembers) data.partyMembers = [];

		if (this.editing) {
			this.renderEdit(container, data, updateState);
		} else {
			this.renderRead(container, data, updateState);
		}
	}

	private rerender(container: HTMLElement, data: AdventureSite, updateState: (data: AdventureSite) => void): void {
		container.empty();
		this.render(container, data, updateState);
	}

	private renderEmpty(
		container: HTMLElement,
		updateState: (data: AdventureSite) => void
	): void {
		const empty = div("mausritter-site-empty");
		empty.appendChild(
			div("mausritter-site-empty-text", ["No adventure site generated yet."])
		);
		empty.appendChild(
			button("Generate Adventure Site", () => {
				updateState(generateAdventureSite());
			}, "mausritter-btn mausritter-btn-primary")
		);
		container.appendChild(empty);
	}

	// ── Helpers ──

	private buildRoomLookup(data: AdventureSite): Map<string, AdventureSiteRoom> {
		const map = new Map<string, AdventureSiteRoom>();
		for (const room of data.rooms) {
			map.set(`${room.row},${room.col}`, room);
		}
		return map;
	}

	private partyInRoom(data: AdventureSite, roomId: number): { name: string; index: number }[] {
		return data.partyMembers
			.map((p, i) => ({ name: p.name, index: i, roomId: p.roomId }))
			.filter(p => p.roomId === roomId);
	}

	private partyMarker(memberIndex: number, initial: string): HTMLElement {
		const marker = span("mausritter-site-party-marker");
		marker.style.background = PARTY_COLORS[memberIndex % PARTY_COLORS.length];
		marker.textContent = initial;
		return marker;
	}

	private nextRoomId(data: AdventureSite): number {
		return data.rooms.length > 0 ? Math.max(...data.rooms.map(r => r.id)) + 1 : 1;
	}

	private selectCell(card: HTMLElement, room: AdventureSiteRoom): void {
		card.querySelectorAll(".mausritter-site-cell-selected").forEach(
			(el) => el.removeClass("mausritter-site-cell-selected")
		);
		card.querySelector(
			`.mausritter-site-cell-filled[style*="grid-row: ${room.row + 1}"][style*="grid-column: ${room.col + 1}"]`
		)?.addClass("mausritter-site-cell-selected");
	}

	// ── Grid map (shared between read/edit) ──

	private renderGridMap(
		data: AdventureSite,
		container: HTMLElement,
		onSelectRoom: (room: AdventureSiteRoom) => void,
		onSelectEmpty?: (row: number, col: number) => void
	): void {
		const lookup = this.buildRoomLookup(data);
		const gridEl = div("mausritter-site-grid");
		gridEl.style.gridTemplateRows = `repeat(${data.gridRows}, 1fr)`;
		gridEl.style.gridTemplateColumns = `repeat(${data.gridCols}, 1fr)`;

		for (let r = 0; r < data.gridRows; r++) {
			for (let c = 0; c < data.gridCols; c++) {
				const room = lookup.get(`${r},${c}`);
				if (room) {
					const party = this.partyInRoom(data, room.id);
					const cellEl = div(
						`mausritter-site-cell mausritter-site-cell-filled mausritter-site-cell-${room.type.toLowerCase()}`
						+ (data.selectedRoom === room.id ? " mausritter-site-cell-selected" : "")
					);
					cellEl.style.gridRow = `${r + 1}`;
					cellEl.style.gridColumn = `${c + 1}`;

					// Type label
					cellEl.appendChild(div("mausritter-site-cell-type", [room.type]));

					// Icons row (top-right)
					const icons = div("mausritter-site-cell-icons");
					for (const p of party) {
						icons.appendChild(this.partyMarker(p.index, p.name.charAt(0).toUpperCase()));
					}
					if (room.creature) {
						icons.appendChild(span("mausritter-site-cell-icon mausritter-site-cell-creature-icon", "C"));
					}
					if (room.treasure) {
						icons.appendChild(span("mausritter-site-cell-icon mausritter-site-cell-treasure-icon", "T"));
					}
					if (icons.childElementCount > 0) {
						cellEl.appendChild(icons);
					}

					cellEl.addEventListener("click", () => onSelectRoom(room));
					gridEl.appendChild(cellEl);
				} else {
					const cls = onSelectEmpty
						? "mausritter-site-cell mausritter-site-cell-empty mausritter-site-cell-placeable"
						: "mausritter-site-cell mausritter-site-cell-empty";
					const emptyCell = div(cls);
					emptyCell.style.gridRow = `${r + 1}`;
					emptyCell.style.gridColumn = `${c + 1}`;
					if (onSelectEmpty) {
						const row = r, col = c;
						emptyCell.addEventListener("click", () => onSelectEmpty(row, col));
					}
					gridEl.appendChild(emptyCell);
				}
			}
		}

		container.appendChild(gridEl);
	}

	// ── Read-only view ──

	private renderRead(
		container: HTMLElement,
		data: AdventureSite,
		updateState: (data: AdventureSite) => void
	): void {
		const card = div("mausritter-site-card");

		// Header
		const header = div("mausritter-site-header");
		header.appendChild(div("mausritter-site-name-display", [data.name]));
		const headerActions = div("mausritter-site-header-actions");
		headerActions.appendChild(
			button("Edit", () => {
				this.editing = true;
				this.rerender(container, data, updateState);
			}, "mausritter-btn mausritter-btn-small")
		);
		headerActions.appendChild(
			button("Regenerate", () => {
				updateState(generateAdventureSite());
			}, "mausritter-btn mausritter-btn-small")
		);
		header.appendChild(headerActions);
		card.appendChild(header);

		// Summary with bold keywords
		const summary = div("mausritter-site-summary");
		summary.innerHTML = this.buildSummaryHtml(data);
		card.appendChild(summary);

		// Legend
		const legend = div("mausritter-site-legend");
		// Show a colored marker for each party member in the legend
		for (let i = 0; i < data.partyMembers.length; i++) {
			const m = data.partyMembers[i];
			const item = div("mausritter-site-legend-item");
			item.appendChild(this.partyMarker(i, m.name.charAt(0).toUpperCase()));
			item.appendChild(span("mausritter-site-legend-label", m.name));
			legend.appendChild(item);
		}
		legend.appendChild(this.legendItem("mausritter-site-cell-creature-icon", "C", "Creature"));
		legend.appendChild(this.legendItem("mausritter-site-cell-treasure-icon", "T", "Treasure"));
		card.appendChild(legend);

		// Grid map
		const detailPanel = div("mausritter-site-detail");
		this.renderGridMap(data, card, (room) => {
			data.selectedRoom = room.id;
			this.renderReadDetailPanel(detailPanel, room, data, updateState);
			this.selectCell(card, room);
		});

		// Detail panel
		const selectedRoom = data.rooms.find(r => r.id === data.selectedRoom);
		if (selectedRoom) {
			this.renderReadDetailPanel(detailPanel, selectedRoom, data, updateState);
		} else {
			detailPanel.appendChild(
				div("mausritter-site-detail-hint", ["Click a room to see its details."])
			);
		}
		card.appendChild(detailPanel);

		container.appendChild(card);
	}

	private renderReadDetailPanel(
		panel: HTMLElement,
		room: AdventureSiteRoom,
		data: AdventureSite,
		updateState: (data: AdventureSite) => void
	): void {
		panel.empty();

		const header = div("mausritter-site-detail-header");
		header.appendChild(span("mausritter-site-detail-room-id", `Room ${room.id}`));
		header.appendChild(span(`mausritter-site-room-badge mausritter-site-room-badge-${room.type.toLowerCase()}`, room.type));
		if (room.creature) {
			header.appendChild(span("mausritter-site-room-icon mausritter-site-room-creature", "Creature"));
		}
		if (room.treasure) {
			header.appendChild(span("mausritter-site-room-icon mausritter-site-room-treasure", "Treasure"));
		}
		panel.appendChild(header);

		panel.appendChild(div("mausritter-site-detail-desc", [room.description]));

		// Party members in this room
		const party = this.partyInRoom(data, room.id);
		if (party.length > 0) {
			const partyEl = div("mausritter-site-detail-party");
			partyEl.appendChild(span("mausritter-site-detail-party-label", "In this room: "));
			for (const p of party) {
				const tag = span("mausritter-site-detail-party-tag");
				tag.appendChild(this.partyMarker(p.index, p.name.charAt(0).toUpperCase()));
				tag.appendChild(document.createTextNode(p.name));
				partyEl.appendChild(tag);
			}
			panel.appendChild(partyEl);
		}

		// Party action buttons
		const partyActions = div("mausritter-site-detail-party-actions");

		// "Move all here" button
		if (data.partyMembers.length > 0) {
			const allHere = data.partyMembers.every(p => p.roomId === room.id);
			if (!allHere) {
				partyActions.appendChild(
					button("Move all here", () => {
						for (const p of data.partyMembers) p.roomId = room.id;
						updateState(data);
					}, "mausritter-btn mausritter-btn-small")
				);
			}
		}

		// Per-member move buttons for members NOT in this room
		for (const member of data.partyMembers) {
			if (member.roomId !== room.id) {
				partyActions.appendChild(
					button(`Move ${member.name} here`, () => {
						member.roomId = room.id;
						updateState(data);
					}, "mausritter-btn mausritter-btn-tiny")
				);
			}
		}
		if (partyActions.childElementCount > 0) {
			panel.appendChild(partyActions);
		}

		// Add/manage party members
		const addRow = div("mausritter-site-detail-party-add");
		const addInput = el("input", {
			class: "mausritter-site-party-input",
			type: "text",
			placeholder: "Character name...",
		}) as HTMLInputElement;
		addRow.appendChild(addInput);
		addRow.appendChild(
			button("Add to party", () => {
				const name = addInput.value.trim();
				if (name) {
					data.partyMembers.push({ name, roomId: room.id });
					updateState(data);
				}
			}, "mausritter-btn mausritter-btn-tiny")
		);
		panel.appendChild(addRow);

		// List party members with remove buttons
		if (data.partyMembers.length > 0) {
			const memberList = div("mausritter-site-party-list");
			for (let i = 0; i < data.partyMembers.length; i++) {
				const m = data.partyMembers[i];
				const memberRow = div("mausritter-site-party-member");
				memberRow.appendChild(this.partyMarker(i, m.name.charAt(0).toUpperCase()));
				memberRow.appendChild(span("mausritter-site-party-member-name", m.name));
				const roomRef = data.rooms.find(r => r.id === m.roomId);
				memberRow.appendChild(span("mausritter-site-party-member-room", `Room ${roomRef ? roomRef.id : "?"}`));
				memberRow.appendChild(
					button("X", () => {
						data.partyMembers.splice(i, 1);
						updateState(data);
					}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger")
				);
				memberList.appendChild(memberRow);
			}
			panel.appendChild(memberList);
		}
	}

	// ── Edit view ──

	private renderEdit(
		container: HTMLElement,
		data: AdventureSite,
		updateState: (data: AdventureSite) => void
	): void {
		const card = div("mausritter-site-card mausritter-site-card-edit");

		// Header
		const header = div("mausritter-site-header");
		const nameInput = el("input", {
			class: "mausritter-site-name-input",
			type: "text",
		}) as HTMLInputElement;
		nameInput.value = data.name;
		nameInput.addEventListener("change", () => {
			data.name = nameInput.value;
			updateState(data);
		});
		header.appendChild(nameInput);
		header.appendChild(
			button("Done", () => {
				this.editing = false;
				this.rerender(container, data, updateState);
			}, "mausritter-btn mausritter-btn-small mausritter-btn-primary")
		);
		card.appendChild(header);

		// Summary fields
		const fields = div("mausritter-site-fields");
		fields.appendChild(this.renderFieldInput("Construction", data.construction, (val) => {
			data.construction = val;
			updateState(data);
		}));
		fields.appendChild(this.renderFieldInput("Ruin action", data.ruinAction, (val) => {
			data.ruinAction = val;
			updateState(data);
		}));
		fields.appendChild(this.renderFieldInput("Ruination", data.ruination, (val) => {
			data.ruination = val;
			updateState(data);
		}));
		fields.appendChild(this.renderFieldInput("Inhabitants", data.inhabitant, (val) => {
			data.inhabitant = val;
			updateState(data);
		}));
		fields.appendChild(this.renderFieldInput("Action", data.inhabitantAction, (val) => {
			data.inhabitantAction = val;
			updateState(data);
		}));
		fields.appendChild(this.renderFieldInput("Goal", data.inhabitantGoal, (val) => {
			data.inhabitantGoal = val;
			updateState(data);
		}));
		fields.appendChild(this.renderFieldInput("Secret intro", data.secretHidden, (val) => {
			data.secretHidden = val;
			updateState(data);
		}));
		fields.appendChild(this.renderFieldInput("Secret", data.secret, (val) => {
			data.secret = val;
			updateState(data);
		}));
		card.appendChild(fields);

		// Grid map + edit panel — empty cells are clickable to add rooms
		const editPanel = div("mausritter-site-detail");
		this.renderGridMap(data, card,
			(room) => {
				data.selectedRoom = room.id;
				this.renderEditDetailPanel(editPanel, room, data, updateState);
				this.selectCell(card, room);
			},
			(row, col) => {
				// Add room at this specific empty cell
				const nextId = this.nextRoomId(data);
				data.rooms.push({
					id: nextId, row, col,
					type: "Empty", description: "", creature: false, treasure: false,
				});
				data.gridRows = Math.max(data.gridRows, row + 1);
				data.gridCols = Math.max(data.gridCols, col + 1);
				data.selectedRoom = nextId;
				updateState(data);
			}
		);

		const selectedRoom = data.rooms.find(r => r.id === data.selectedRoom);
		if (selectedRoom) {
			this.renderEditDetailPanel(editPanel, selectedRoom, data, updateState);
		} else {
			editPanel.appendChild(
				div("mausritter-site-detail-hint", ["Click a room to edit, or click an empty cell to add a room."])
			);
		}
		card.appendChild(editPanel);

		// Grid resize + remove buttons
		const gridActions = div("mausritter-site-grid-actions");
		gridActions.appendChild(
			button("+ Row", () => {
				data.gridRows++;
				updateState(data);
			}, "mausritter-btn mausritter-btn-small")
		);
		gridActions.appendChild(
			button("+ Column", () => {
				data.gridCols++;
				updateState(data);
			}, "mausritter-btn mausritter-btn-small")
		);
		if (data.selectedRoom > 0) {
			gridActions.appendChild(
				button("Remove Selected", () => {
					this.removeSelectedRoom(data);
					updateState(data);
				}, "mausritter-btn mausritter-btn-small mausritter-btn-danger")
			);
		}
		card.appendChild(gridActions);

		container.appendChild(card);
	}

	private renderEditDetailPanel(
		panel: HTMLElement,
		room: AdventureSiteRoom,
		data: AdventureSite,
		updateState: (data: AdventureSite) => void
	): void {
		panel.empty();

		const header = div("mausritter-site-detail-header");
		header.appendChild(span("mausritter-site-detail-room-id", `Room ${room.id}`));

		// Type dropdown
		const typeSelect = el("select", { class: "mausritter-site-room-type-select" }) as HTMLSelectElement;
		for (const t of ROOM_TYPES) {
			const opt = el("option", { value: t }, [t]) as HTMLOptionElement;
			if (t === room.type) opt.selected = true;
			typeSelect.appendChild(opt);
		}
		typeSelect.addEventListener("change", () => {
			room.type = typeSelect.value;
			updateState(data);
		});
		header.appendChild(typeSelect);

		// Creature checkbox
		const creatureLabel = el("label", { class: "mausritter-site-room-checkbox-label" });
		const creatureCheck = el("input", { type: "checkbox" }) as HTMLInputElement;
		creatureCheck.checked = room.creature;
		creatureCheck.addEventListener("change", () => {
			room.creature = creatureCheck.checked;
			updateState(data);
		});
		creatureLabel.appendChild(creatureCheck);
		creatureLabel.appendChild(document.createTextNode(" Creature"));
		header.appendChild(creatureLabel);

		// Treasure checkbox
		const treasureLabel = el("label", { class: "mausritter-site-room-checkbox-label" });
		const treasureCheck = el("input", { type: "checkbox" }) as HTMLInputElement;
		treasureCheck.checked = room.treasure;
		treasureCheck.addEventListener("change", () => {
			room.treasure = treasureCheck.checked;
			updateState(data);
		});
		treasureLabel.appendChild(treasureCheck);
		treasureLabel.appendChild(document.createTextNode(" Treasure"));
		header.appendChild(treasureLabel);

		panel.appendChild(header);

		// Description
		const descInput = el("textarea", {
			class: "mausritter-site-detail-desc-input",
		}) as HTMLTextAreaElement;
		descInput.value = room.description;
		descInput.addEventListener("change", () => {
			room.description = descInput.value;
			updateState(data);
		});
		panel.appendChild(descInput);
	}

	private removeSelectedRoom(data: AdventureSite): void {
		const idx = data.rooms.findIndex(r => r.id === data.selectedRoom);
		if (idx >= 0) {
			data.rooms.splice(idx, 1);
			data.selectedRoom = -1;
		}
	}

	// ── Shared utilities ──

	private esc(text: string): string {
		const d = document.createElement("div");
		d.appendChild(document.createTextNode(text));
		return d.innerHTML;
	}

	private buildSummaryHtml(data: AdventureSite): string {
		const ruinAction = data.ruinAction || "ruined by";
		const inhabitantAction = data.inhabitantAction || "search for";
		const secretHidden = data.secretHidden || "Hidden within";
		return `${this.esc(data.name)}, ${this.esc(data.construction)} ${this.esc(ruinAction)} <b>${this.esc(data.ruination)}</b>. <b>${this.esc(data.inhabitant)}</b> ${this.esc(inhabitantAction)} <b>${this.esc(data.inhabitantGoal)}</b>. ${this.esc(secretHidden)} <b>${this.esc(data.secret)}</b>.`;
	}

	private legendItem(iconClass: string, letter: string, label: string): HTMLElement {
		const item = div("mausritter-site-legend-item");
		item.appendChild(span(`mausritter-site-cell-icon ${iconClass}`, letter));
		item.appendChild(span("mausritter-site-legend-label", label));
		return item;
	}

	private renderFieldInput(label: string, value: string, onChange: (val: string) => void): HTMLElement {
		const row = div("mausritter-site-field-row");
		row.appendChild(el("label", { class: "mausritter-site-field-label" }, [label]));
		const input = el("input", {
			class: "mausritter-site-field-input",
			type: "text",
		}) as HTMLInputElement;
		input.value = value;
		input.addEventListener("change", () => onChange(input.value));
		row.appendChild(input);
		return row;
	}
}
