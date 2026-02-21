import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { Creature } from "../types/creature";
import { HomebrewRegistry } from "../engine/homebrew";
import { creatureTemplates } from "../data/creatures";
import { div, button, span, el } from "../utils/dom-helpers";

interface CreatureState {
	creatures: Creature[];
	selectedTemplate: string;
}

export class CreatureRenderer extends BaseRenderer<CreatureState> {
	protected blockType = "mausritter-creature";
	private homebrew: HomebrewRegistry;

	constructor(plugin: Plugin, homebrew: HomebrewRegistry) {
		super(plugin);
		this.homebrew = homebrew;
	}

	protected render(
		container: HTMLElement,
		data: CreatureState | null,
		updateState: (data: CreatureState) => void
	): void {
		const state: CreatureState = data ?? { creatures: [], selectedTemplate: "" };

		container.addClass("mausritter-creature");
		container.appendChild(div("mausritter-title", ["Creatures"]));

		// Template selector — populate async to include homebrew
		const controls = div("mausritter-creature-controls");
		const select = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		const defaultOpt = el("option", { value: "" }, ["Choose template..."]);
		select.appendChild(defaultOpt);

		// Built-in templates first
		for (const name of Object.keys(creatureTemplates)) {
			const opt = el("option", { value: name }, [name]);
			if (name === state.selectedTemplate) (opt as HTMLOptionElement).selected = true;
			select.appendChild(opt);
		}

		// Load homebrew templates and add them to the dropdown
		this.homebrew.getData().then(hb => {
			if (hb.creatures) {
				for (const c of hb.creatures) {
					if (!creatureTemplates[c.name]) {
						const opt = el("option", { value: `homebrew:${c.name}` }, [`${c.name} *`]);
						if (`homebrew:${c.name}` === state.selectedTemplate) (opt as HTMLOptionElement).selected = true;
						select.appendChild(opt);
					}
				}
			}
		});

		select.addEventListener("change", () => {
			state.selectedTemplate = select.value;
		});
		controls.appendChild(select);

		controls.appendChild(
			button("Add Creature", async () => {
				let template: Creature | undefined;

				if (state.selectedTemplate.startsWith("homebrew:")) {
					const name = state.selectedTemplate.slice("homebrew:".length);
					const hb = await this.homebrew.getData();
					template = hb.creatures?.find(c => c.name === name);
				} else {
					template = creatureTemplates[state.selectedTemplate];
				}

				if (!template) return;
				const creature: Creature = {
					...JSON.parse(JSON.stringify(template)),
					hpCurrent: template.hp,
				};
				state.creatures.push(creature);
				updateState(state);
			}, "mausritter-btn mausritter-btn-primary")
		);

		container.appendChild(controls);

		// Creature cards
		const cardsContainer = div("mausritter-creature-cards");
		state.creatures.forEach((creature, index) => {
			cardsContainer.appendChild(
				this.renderCreatureCard(creature, index, state, updateState)
			);
		});
		container.appendChild(cardsContainer);
	}

	private renderCreatureCard(
		creature: Creature,
		index: number,
		state: CreatureState,
		updateState: (data: CreatureState) => void
	): HTMLElement {
		const card = div(
			`mausritter-creature-card ${creature.incapacitated ? "mausritter-incapacitated" : ""}`
		);

		// Name row
		const nameRow = div("mausritter-creature-name-row");
		const nameInput = el("input", { class: "mausritter-creature-name-input", type: "text" }) as HTMLInputElement;
		nameInput.value = creature.name;
		nameInput.addEventListener("change", () => {
			creature.name = nameInput.value;
			updateState(state);
		});
		nameRow.appendChild(nameInput);

		nameRow.appendChild(
			button(creature.incapacitated ? "Revive" : "KO", () => {
				creature.incapacitated = !creature.incapacitated;
				updateState(state);
			}, "mausritter-btn mausritter-btn-tiny")
		);

		nameRow.appendChild(
			button("X", () => {
				state.creatures.splice(index, 1);
				updateState(state);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger")
		);

		card.appendChild(nameRow);

		// Details
		if (creature.armour > 0) {
			card.appendChild(div("mausritter-creature-detail", [`Armour ${creature.armour}`]));
		}

		// Attacks
		const attacksText = creature.attacks
			.map(a => `${a.damage} ${a.name}${a.target ? ` (${a.target})` : ""}`)
			.join(", ");
		card.appendChild(div("mausritter-creature-detail", [`Attacks: ${attacksText}`]));

		if (creature.criticalDamage) {
			card.appendChild(div("mausritter-creature-detail", [`Critical: ${creature.criticalDamage}`]));
		}
		if (creature.notes) {
			card.appendChild(div("mausritter-creature-detail mausritter-creature-notes", [creature.notes]));
		}

		// Stats
		const statsRow = div("mausritter-creature-stats");
		for (const statName of ["str", "dex", "wil"] as const) {
			const statBox = div("mausritter-creature-stat");
			statBox.appendChild(span("mausritter-creature-stat-label", statName.toUpperCase()));
			const input = el("input", {
				class: "mausritter-stat-input",
				type: "number",
			}) as HTMLInputElement;
			input.value = String(creature[statName]);
			input.addEventListener("change", () => {
				(creature as any)[statName] = parseInt(input.value) || 0;
				updateState(state);
			});
			statBox.appendChild(input);
			statsRow.appendChild(statBox);
		}
		card.appendChild(statsRow);

		// HP
		const hpRow = div("mausritter-creature-hp");
		hpRow.appendChild(span("mausritter-creature-stat-label", "HP"));
		hpRow.appendChild(
			button("-", () => {
				creature.hpCurrent = Math.max(0, (creature.hpCurrent ?? creature.hp) - 1);
				updateState(state);
			}, "mausritter-btn mausritter-btn-tiny")
		);
		hpRow.appendChild(span("mausritter-resource-value",
			`${creature.hpCurrent ?? creature.hp}/${creature.hp}`
		));
		hpRow.appendChild(
			button("+", () => {
				creature.hpCurrent = Math.min(creature.hp, (creature.hpCurrent ?? creature.hp) + 1);
				updateState(state);
			}, "mausritter-btn mausritter-btn-tiny")
		);
		card.appendChild(hpRow);

		return card;
	}
}
