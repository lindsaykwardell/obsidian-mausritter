import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { Faction, FactionGoal } from "../types/generator";
import { generateFaction } from "../engine/faction";
import { d6 } from "../engine/dice";
import { div, button, span, el } from "../utils/dom-helpers";

export class FactionRenderer extends BaseRenderer<Faction> {
	protected blockType = "mausritter-faction";
	private editing = false;

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: Faction | null,
		updateState: (data: Faction) => void
	): void {
		container.addClass("mausritter-faction");

		if (!data || !data.name) {
			this.renderEmpty(container, updateState);
			return;
		}

		if (this.editing) {
			this.renderEdit(container, data, updateState);
		} else {
			this.renderRead(container, data, updateState);
		}
	}

	private renderEmpty(
		container: HTMLElement,
		updateState: (data: Faction) => void
	): void {
		const empty = div("mausritter-faction-empty");
		empty.appendChild(
			div("mausritter-faction-empty-text", ["No faction generated yet."])
		);
		empty.appendChild(
			button("Generate Faction", () => {
				updateState(generateFaction());
			}, "mausritter-btn mausritter-btn-primary")
		);
		container.appendChild(empty);
	}

	// ── Read-only view ──

	private renderRead(
		container: HTMLElement,
		data: Faction,
		updateState: (data: Faction) => void
	): void {
		const card = div("mausritter-faction-card");

		// Header
		const header = div("mausritter-faction-header");
		header.appendChild(div("mausritter-faction-name-display", [data.name]));
		const headerActions = div("mausritter-faction-header-actions");
		headerActions.appendChild(
			button("Edit", () => {
				this.editing = true;
				updateState(data);
			}, "mausritter-btn mausritter-btn-small")
		);
		headerActions.appendChild(
			button("Regenerate", () => {
				updateState(generateFaction());
			}, "mausritter-btn mausritter-btn-small")
		);
		header.appendChild(headerActions);
		card.appendChild(header);

		// Resources
		const resSection = div("mausritter-faction-section");
		resSection.appendChild(div("mausritter-faction-section-label", ["Resources"]));
		const resList = el("ul", { class: "mausritter-faction-resource-list-readonly" });
		for (const resource of data.resources) {
			resList.appendChild(el("li", { class: "mausritter-faction-resource-item" }, [resource]));
		}
		resSection.appendChild(resList);
		card.appendChild(resSection);

		// Goals
		const goalSection = div("mausritter-faction-section");
		goalSection.appendChild(div("mausritter-faction-section-label", ["Goals"]));
		data.goals.forEach((goal) => {
			goalSection.appendChild(this.renderReadGoal(goal, data, updateState));
		});
		card.appendChild(goalSection);

		container.appendChild(card);
	}

	private renderReadGoal(
		goal: FactionGoal,
		data: Faction,
		updateState: (data: Faction) => void
	): HTMLElement {
		const goalEl = div("mausritter-faction-goal");
		goalEl.appendChild(div("mausritter-faction-goal-description", [goal.description]));

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

		// Progress Roll button (only for incomplete goals)
		if (goal.progress < goal.total) {
			goalEl.appendChild(
				button("Progress Roll", () => {
					this.renderProgressRollPanel(goalEl, goal, data, updateState);
				}, "mausritter-btn mausritter-btn-small mausritter-faction-progress-roll-btn")
			);
		} else {
			// Goal complete — offer to add a new resource
			goalEl.appendChild(
				button("+ New Resource", () => {
					data.resources.push("New resource");
					updateState(data);
				}, "mausritter-btn mausritter-btn-small")
			);
		}

		return goalEl;
	}

	private renderProgressRollPanel(
		goalEl: HTMLElement,
		goal: FactionGoal,
		data: Faction,
		updateState: (data: Faction) => void
	): void {
		// Remove existing panel if any
		const existing = goalEl.querySelector(".mausritter-faction-roll-panel");
		if (existing) { existing.remove(); return; }

		const panel = div("mausritter-faction-roll-panel");

		const diceRoll = d6();
		let ownBonus = 0;
		let rivalPenalty = 0;

		const rollLabel = div("mausritter-faction-roll-dice", [`d6 roll: ${diceRoll}`]);
		panel.appendChild(rollLabel);

		// Own resource checkboxes
		const ownSection = div("mausritter-faction-roll-section");
		ownSection.appendChild(span("mausritter-label", "Own relevant resources (+1 each):"));
		const checkboxes: HTMLInputElement[] = [];
		for (const resource of data.resources) {
			const label = document.createElement("label");
			label.className = "mausritter-faction-roll-checkbox-label";
			const cb = document.createElement("input");
			cb.type = "checkbox";
			cb.addEventListener("change", () => {
				ownBonus = checkboxes.filter(c => c.checked).length;
				updateTotal();
			});
			checkboxes.push(cb);
			label.appendChild(cb);
			label.appendChild(document.createTextNode(` ${resource}`));
			ownSection.appendChild(label);
		}
		panel.appendChild(ownSection);

		// Rival resources
		const rivalSection = div("mausritter-faction-roll-section");
		rivalSection.appendChild(span("mausritter-label", "Rival relevant resources (-1 each):"));
		const rivalInput = el("input", { class: "mausritter-stat-input", type: "number" }) as HTMLInputElement;
		rivalInput.value = "0";
		rivalInput.min = "0";
		rivalInput.addEventListener("change", () => {
			rivalPenalty = Math.max(0, parseInt(rivalInput.value) || 0);
			updateTotal();
		});
		rivalSection.appendChild(rivalInput);
		panel.appendChild(rivalSection);

		// Total display
		const totalEl = div("mausritter-faction-roll-total");
		const updateTotal = () => {
			const total = diceRoll + ownBonus - rivalPenalty;
			let progressGain = 0;
			if (total >= 6) progressGain = 2;
			else if (total >= 4) progressGain = 1;
			totalEl.textContent = `Total: ${total} → +${progressGain} progress`;
		};
		updateTotal();
		panel.appendChild(totalEl);

		// Apply button
		panel.appendChild(
			button("Apply", () => {
				const total = diceRoll + ownBonus - rivalPenalty;
				let progressGain = 0;
				if (total >= 6) progressGain = 2;
				else if (total >= 4) progressGain = 1;
				goal.progress = Math.min(goal.total, goal.progress + progressGain);
				panel.remove();
				updateState(data);
			}, "mausritter-btn mausritter-btn-primary mausritter-btn-small")
		);

		goalEl.appendChild(panel);
	}

	// ── Edit view ──

	private renderEdit(
		container: HTMLElement,
		data: Faction,
		updateState: (data: Faction) => void
	): void {
		const card = div("mausritter-faction-card mausritter-faction-card-edit");

		// Header
		const header = div("mausritter-faction-header");
		const nameInput = el("input", {
			class: "mausritter-faction-name-input",
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
				updateState(data);
			}, "mausritter-btn mausritter-btn-small mausritter-btn-primary")
		);
		card.appendChild(header);

		// Resources
		const resSection = div("mausritter-faction-section");
		resSection.appendChild(div("mausritter-faction-section-label", ["Resources"]));
		const resList = div("mausritter-faction-resource-list");
		data.resources.forEach((resource, rIdx) => {
			const row = div("mausritter-faction-resource-row");
			const input = el("input", {
				class: "mausritter-faction-resource-input",
				type: "text",
			}) as HTMLInputElement;
			input.value = resource;
			input.addEventListener("change", () => {
				data.resources[rIdx] = input.value;
				updateState(data);
			});
			row.appendChild(input);
			row.appendChild(
				button("X", () => {
					data.resources.splice(rIdx, 1);
					updateState(data);
				}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger")
			);
			resList.appendChild(row);
		});
		resSection.appendChild(resList);
		resSection.appendChild(
			button("+ Resource", () => {
				data.resources.push("New resource");
				updateState(data);
			}, "mausritter-btn mausritter-btn-small")
		);
		card.appendChild(resSection);

		// Goals
		const goalSection = div("mausritter-faction-section");
		goalSection.appendChild(div("mausritter-faction-section-label", ["Goals"]));
		data.goals.forEach((goal, gIdx) => {
			goalSection.appendChild(this.renderEditGoal(goal, gIdx, data, updateState));
		});
		goalSection.appendChild(
			button("+ Goal", () => {
				data.goals.push({ description: "New goal", progress: 0, total: 3 });
				updateState(data);
			}, "mausritter-btn mausritter-btn-small")
		);
		card.appendChild(goalSection);

		container.appendChild(card);
	}

	private renderEditGoal(
		goal: FactionGoal,
		gIdx: number,
		data: Faction,
		updateState: (data: Faction) => void
	): HTMLElement {
		const goalEl = div("mausritter-faction-goal");

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
				data.goals.splice(gIdx, 1);
				updateState(data);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger")
		);
		goalEl.appendChild(descRow);

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
