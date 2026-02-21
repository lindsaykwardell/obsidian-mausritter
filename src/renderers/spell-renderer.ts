import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { SpellState } from "../types/spell";
import { spellTemplates } from "../data/spells";
import { castSpell, rechargeSpell } from "../engine/magic";
import { div, button, span, el } from "../utils/dom-helpers";

interface SpellBlockState {
	spells: SpellState[];
	selectedTemplate: string;
}

export class SpellRenderer extends BaseRenderer<SpellBlockState> {
	protected blockType = "mausritter-spell";

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: SpellBlockState | null,
		updateState: (data: SpellBlockState) => void
	): void {
		const state: SpellBlockState = data ?? { spells: [], selectedTemplate: "" };

		container.addClass("mausritter-spell");
		container.appendChild(div("mausritter-title", ["Spells"]));

		// Template selector
		const controls = div("mausritter-spell-controls");

		const select = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		const defaultOpt = el("option", { value: "" }, ["Choose spell..."]);
		select.appendChild(defaultOpt);
		for (const tmpl of spellTemplates) {
			const opt = el("option", { value: tmpl.name }, [tmpl.name]);
			if (tmpl.name === state.selectedTemplate) (opt as HTMLOptionElement).selected = true;
			select.appendChild(opt);
		}
		select.addEventListener("change", () => {
			state.selectedTemplate = select.value;
		});
		controls.appendChild(select);

		controls.appendChild(
			button("Add Spell", () => {
				const template = spellTemplates.find(t => t.name === state.selectedTemplate);
				if (!template) return;
				state.spells.push({
					name: template.name,
					usage: { total: 3, used: 0 },
					power: 1,
					log: [],
				});
				updateState(state);
			}, "mausritter-btn mausritter-btn-primary")
		);

		container.appendChild(controls);

		// Spell cards
		const cardsContainer = div("mausritter-spell-cards");
		state.spells.forEach((spell, index) => {
			cardsContainer.appendChild(
				this.renderSpellCard(spell, index, state, updateState)
			);
		});
		container.appendChild(cardsContainer);
	}

	private renderSpellCard(
		spell: SpellState,
		index: number,
		state: SpellBlockState,
		updateState: (data: SpellBlockState) => void
	): HTMLElement {
		const template = spellTemplates.find(t => t.name === spell.name);
		const card = div("mausritter-spell-card");

		// Header
		const header = div("mausritter-spell-header");
		header.appendChild(span("mausritter-spell-name", spell.name));
		header.appendChild(
			button("X", () => {
				state.spells.splice(index, 1);
				updateState(state);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger")
		);
		card.appendChild(header);

		// Description
		if (template) {
			card.appendChild(div("mausritter-spell-desc", [template.description]));
		}

		// Usage dots
		const usageRow = div("mausritter-usage-dots");
		for (let i = 0; i < spell.usage.total; i++) {
			const dot = span(
				i < spell.usage.used ? "mausritter-usage-dot mausritter-usage-used" : "mausritter-usage-dot"
			);
			dot.addEventListener("click", () => {
				if (i < spell.usage.used) {
					spell.usage.used = i;
				} else {
					spell.usage.used = i + 1;
				}
				updateState(state);
			});
			usageRow.appendChild(dot);
		}
		card.appendChild(usageRow);

		// Power selector
		const powerRow = div("mausritter-spell-power");
		powerRow.appendChild(span("mausritter-label", "Power: "));
		for (const p of [1, 2, 3]) {
			const btn = button(String(p), () => {
				spell.power = p;
				updateState(state);
			}, `mausritter-btn mausritter-btn-tiny ${spell.power === p ? "mausritter-btn-active" : ""}`);
			powerRow.appendChild(btn);
		}
		card.appendChild(powerRow);

		// Cast button
		const castRow = div("mausritter-spell-cast");
		const isDepleted = spell.usage.used >= spell.usage.total;

		castRow.appendChild(
			button(isDepleted ? "Depleted" : "Cast", () => {
				if (isDepleted || !template) return;
				spell.usage.used += 1;
				const result = castSpell(spell.name, template.description, spell.power);
				spell.log.push(
					`Cast at power ${result.power}: [${result.dice.join(",")}] = ${result.sum}. ${result.resolvedText}`
				);
				if (result.miscast) {
					spell.log.push(`MISCAST! Take ${result.miscastDamage} damage to WIL.`);
				}
				updateState(state);
			}, `mausritter-btn ${isDepleted ? "mausritter-btn-disabled" : "mausritter-btn-primary"}`)
		);

		castRow.appendChild(
			button("Recharge", () => {
				if (spell.usage.used <= 0) return;
				const result = rechargeSpell();
				if (result.recharged) {
					spell.usage.used = Math.max(0, spell.usage.used - 1);
					spell.log.push(`Recharge: rolled ${result.roll} — recovered a usage dot!`);
				} else {
					spell.log.push(`Recharge: rolled ${result.roll} — no effect.`);
				}
				updateState(state);
			}, "mausritter-btn")
		);

		card.appendChild(castRow);

		// Log
		if (spell.log.length > 0) {
			const logEl = div("mausritter-spell-log");
			for (const entry of [...spell.log].reverse().slice(0, 5)) {
				logEl.appendChild(div("mausritter-log-entry", [entry]));
			}
			card.appendChild(logEl);
		}

		return card;
	}
}
