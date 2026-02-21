import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { Faction, FactionGoal, FactionTracker } from "../types/generator";
import { generateFaction, generateFactionSet } from "../engine/faction";
import { div, button, span, el } from "../utils/dom-helpers";

export class FactionRenderer extends BaseRenderer<FactionTracker> {
	protected blockType = "mausritter-faction";
	private editingIndex: number | null = null;

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: FactionTracker | null,
		updateState: (data: FactionTracker) => void
	): void {
		container.addClass("mausritter-faction");

		if (!data || !data.factions || data.factions.length === 0) {
			this.renderEmpty(container, updateState);
			return;
		}

		container.appendChild(div("mausritter-title", ["Factions"]));

		// Top-level actions
		const actions = div("mausritter-faction-actions");
		actions.appendChild(
			button("Add Faction", () => {
				data.factions.push(generateFaction());
				updateState(data);
			}, "mausritter-btn mausritter-btn-primary")
		);
		actions.appendChild(
			button("Regenerate All", () => {
				this.editingIndex = null;
				const newData = generateFactionSet(data.factions.length);
				updateState(newData);
			}, "mausritter-btn")
		);
		container.appendChild(actions);

		// Faction cards
		const cards = div("mausritter-faction-cards");
		data.factions.forEach((faction, index) => {
			if (this.editingIndex === index) {
				cards.appendChild(this.renderEditCard(faction, index, data, updateState));
			} else {
				cards.appendChild(this.renderReadCard(faction, index, data, updateState));
			}
		});
		container.appendChild(cards);
	}

	private renderEmpty(
		container: HTMLElement,
		updateState: (data: FactionTracker) => void
	): void {
		const empty = div("mausritter-faction-empty");
		empty.appendChild(
			div("mausritter-faction-empty-text", ["No factions generated yet."])
		);
		empty.appendChild(
			button("Generate Factions", () => {
				updateState(generateFactionSet());
			}, "mausritter-btn mausritter-btn-primary")
		);
		container.appendChild(empty);
	}

	// ── Read-only card ──

	private renderReadCard(
		faction: Faction,
		index: number,
		data: FactionTracker,
		updateState: (data: FactionTracker) => void
	): HTMLElement {
		const card = div("mausritter-faction-card");

		// Header
		const header = div("mausritter-faction-header");
		header.appendChild(div("mausritter-faction-name-display", [faction.name]));
		header.appendChild(
			button("Edit", () => {
				this.editingIndex = index;
				updateState(data);
			}, "mausritter-btn mausritter-btn-small")
		);
		card.appendChild(header);

		// Resources
		const resSection = div("mausritter-faction-section");
		resSection.appendChild(div("mausritter-faction-section-label", ["Resources"]));
		const resList = el("ul", { class: "mausritter-faction-resource-list-readonly" });
		for (const resource of faction.resources) {
			resList.appendChild(el("li", { class: "mausritter-faction-resource-item" }, [resource]));
		}
		resSection.appendChild(resList);
		card.appendChild(resSection);

		// Goals
		const goalSection = div("mausritter-faction-section");
		goalSection.appendChild(div("mausritter-faction-section-label", ["Goals"]));
		faction.goals.forEach((goal) => {
			goalSection.appendChild(this.renderReadGoal(goal, data, updateState));
		});
		card.appendChild(goalSection);

		return card;
	}

	private renderReadGoal(
		goal: FactionGoal,
		data: FactionTracker,
		updateState: (data: FactionTracker) => void
	): HTMLElement {
		const goalEl = div("mausritter-faction-goal");

		goalEl.appendChild(div("mausritter-faction-goal-description", [goal.description]));

		// Progress track - still clickable in read mode for convenience
		const track = div("mausritter-faction-progress-track");
		for (let i = 0; i < goal.total; i++) {
			const circle = span(
				`mausritter-faction-progress-circle ${i < goal.progress ? "mausritter-faction-progress-filled" : ""}`
			);
			circle.addEventListener("click", () => {
				if (i < goal.progress) {
					goal.progress = i;
				} else {
					goal.progress = i + 1;
				}
				updateState(data);
			});
			track.appendChild(circle);
		}
		if (goal.progress >= goal.total) {
			track.appendChild(span("mausritter-faction-goal-complete", "Complete!"));
		}
		goalEl.appendChild(track);

		return goalEl;
	}

	// ── Edit card ──

	private renderEditCard(
		faction: Faction,
		index: number,
		data: FactionTracker,
		updateState: (data: FactionTracker) => void
	): HTMLElement {
		const card = div("mausritter-faction-card mausritter-faction-card-edit");

		// Header row with name input and actions
		const header = div("mausritter-faction-header");
		const nameInput = el("input", {
			class: "mausritter-faction-name-input",
			type: "text",
		}) as HTMLInputElement;
		nameInput.value = faction.name;
		nameInput.addEventListener("change", () => {
			faction.name = nameInput.value;
			updateState(data);
		});
		header.appendChild(nameInput);
		header.appendChild(
			button("Done", () => {
				this.editingIndex = null;
				updateState(data);
			}, "mausritter-btn mausritter-btn-small mausritter-btn-primary")
		);
		header.appendChild(
			button("X", () => {
				this.editingIndex = null;
				data.factions.splice(index, 1);
				updateState(data);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger")
		);
		card.appendChild(header);

		// Resources
		card.appendChild(this.renderEditResources(faction, data, updateState));

		// Goals
		card.appendChild(this.renderEditGoals(faction, data, updateState));

		return card;
	}

	private renderEditResources(
		faction: Faction,
		data: FactionTracker,
		updateState: (data: FactionTracker) => void
	): HTMLElement {
		const section = div("mausritter-faction-section");
		section.appendChild(div("mausritter-faction-section-label", ["Resources"]));

		const list = div("mausritter-faction-resource-list");
		faction.resources.forEach((resource, rIdx) => {
			const row = div("mausritter-faction-resource-row");
			const input = el("input", {
				class: "mausritter-faction-resource-input",
				type: "text",
			}) as HTMLInputElement;
			input.value = resource;
			input.addEventListener("change", () => {
				faction.resources[rIdx] = input.value;
				updateState(data);
			});
			row.appendChild(input);
			row.appendChild(
				button("X", () => {
					faction.resources.splice(rIdx, 1);
					updateState(data);
				}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger")
			);
			list.appendChild(row);
		});
		section.appendChild(list);

		section.appendChild(
			button("+ Resource", () => {
				faction.resources.push("New resource");
				updateState(data);
			}, "mausritter-btn mausritter-btn-small")
		);

		return section;
	}

	private renderEditGoals(
		faction: Faction,
		data: FactionTracker,
		updateState: (data: FactionTracker) => void
	): HTMLElement {
		const section = div("mausritter-faction-section");
		section.appendChild(div("mausritter-faction-section-label", ["Goals"]));

		faction.goals.forEach((goal, gIdx) => {
			section.appendChild(this.renderEditGoal(goal, gIdx, faction, data, updateState));
		});

		section.appendChild(
			button("+ Goal", () => {
				faction.goals.push({ description: "New goal", progress: 0, total: 3 });
				updateState(data);
			}, "mausritter-btn mausritter-btn-small")
		);

		return section;
	}

	private renderEditGoal(
		goal: FactionGoal,
		gIdx: number,
		faction: Faction,
		data: FactionTracker,
		updateState: (data: FactionTracker) => void
	): HTMLElement {
		const goalEl = div("mausritter-faction-goal");

		// Goal description row
		const descRow = div("mausritter-faction-goal-desc-row");
		const descInput = el("input", {
			class: "mausritter-faction-goal-input",
			type: "text",
		}) as HTMLInputElement;
		descInput.value = goal.description;
		descInput.addEventListener("change", () => {
			goal.description = descInput.value;
			updateState(data);
		});
		descRow.appendChild(descInput);

		// Total marks control
		const totalControl = div("mausritter-faction-goal-total");
		totalControl.appendChild(
			button("-", () => {
				if (goal.total > 2) {
					goal.total--;
					if (goal.progress > goal.total) goal.progress = goal.total;
					updateState(data);
				}
			}, "mausritter-btn mausritter-btn-tiny")
		);
		totalControl.appendChild(span("mausritter-faction-goal-total-value", String(goal.total)));
		totalControl.appendChild(
			button("+", () => {
				if (goal.total < 5) {
					goal.total++;
					updateState(data);
				}
			}, "mausritter-btn mausritter-btn-tiny")
		);
		descRow.appendChild(totalControl);

		descRow.appendChild(
			button("X", () => {
				faction.goals.splice(gIdx, 1);
				updateState(data);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger")
		);
		goalEl.appendChild(descRow);

		// Progress track - clickable circles
		const track = div("mausritter-faction-progress-track");
		for (let i = 0; i < goal.total; i++) {
			const circle = span(
				`mausritter-faction-progress-circle ${i < goal.progress ? "mausritter-faction-progress-filled" : ""}`
			);
			circle.addEventListener("click", () => {
				if (i < goal.progress) {
					goal.progress = i;
				} else {
					goal.progress = i + 1;
				}
				updateState(data);
			});
			track.appendChild(circle);
		}
		if (goal.progress >= goal.total) {
			track.appendChild(span("mausritter-faction-goal-complete", "Complete!"));
		}
		goalEl.appendChild(track);

		return goalEl;
	}
}
