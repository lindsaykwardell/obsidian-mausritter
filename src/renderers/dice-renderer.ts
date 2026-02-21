import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { rollDice, attributeSave, usageCheck, DiceResult } from "../engine/dice";
import { div, button, span, el } from "../utils/dom-helpers";

interface DiceState {
	history: Array<{
		notation: string;
		rolls: number[];
		total: number;
		timestamp: number;
		label?: string;
	}>;
}

export class DiceRenderer extends BaseRenderer<DiceState> {
	protected blockType = "mausritter-dice";

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: DiceState | null,
		updateState: (data: DiceState) => void
	): void {
		const state: DiceState = data ?? { history: [] };

		container.addClass("mausritter-dice");

		// Title
		container.appendChild(div("mausritter-title", ["Dice Roller"]));

		// Advantage / Disadvantage toggle
		let advantageMode: "normal" | "advantage" | "disadvantage" = "normal";

		const modeContainer = div("mausritter-dice-mode");
		const modeLabel = span("mausritter-dice-mode-label", "Normal");

		const cycleMode = () => {
			if (advantageMode === "normal") {
				advantageMode = "advantage";
				modeLabel.textContent = "Advantage";
				modeContainer.className = "mausritter-dice-mode mausritter-advantage";
			} else if (advantageMode === "advantage") {
				advantageMode = "disadvantage";
				modeLabel.textContent = "Disadvantage";
				modeContainer.className = "mausritter-dice-mode mausritter-disadvantage";
			} else {
				advantageMode = "normal";
				modeLabel.textContent = "Normal";
				modeContainer.className = "mausritter-dice-mode";
			}
		};

		modeContainer.appendChild(button("Toggle", cycleMode, "mausritter-btn mausritter-btn-small"));
		modeContainer.appendChild(modeLabel);
		container.appendChild(modeContainer);

		// Quick roll buttons
		const quickRolls = div("mausritter-dice-quick");
		for (const sides of [4, 6, 8, 10, 12, 20]) {
			quickRolls.appendChild(
				button(`d${sides}`, () => {
					const result = rollDice(
						1,
						sides,
						advantageMode === "advantage",
						advantageMode === "disadvantage"
					);
					addResult(result);
				}, "mausritter-btn mausritter-btn-die")
			);
		}
		container.appendChild(quickRolls);

		// Special rolls
		const specialRolls = div("mausritter-dice-special");

		specialRolls.appendChild(
			button("Attribute Save", () => {
				const statInput = container.querySelector<HTMLInputElement>(".mausritter-dice-stat-input");
				const statVal = statInput ? parseInt(statInput.value) : 10;
				const result = attributeSave(statVal);
				addResult({
					notation: `Save vs ${statVal}`,
					rolls: [result.roll],
					total: result.roll,
				}, result.success ? "Success!" : "Failure!");
			}, "mausritter-btn")
		);

		const statInput = el("input", {
			class: "mausritter-dice-stat-input",
			type: "number",
		}) as HTMLInputElement;
		statInput.value = "10";
		statInput.min = "1";
		statInput.max = "20";
		specialRolls.appendChild(statInput);

		specialRolls.appendChild(
			button("Usage Check", () => {
				const result = usageCheck();
				addResult({
					notation: "Usage (d6)",
					rolls: [result.roll],
					total: result.roll,
				}, result.depleted ? "Mark usage dot!" : "Safe");
			}, "mausritter-btn")
		);

		container.appendChild(specialRolls);

		// History
		const historyContainer = div("mausritter-dice-history");
		const renderHistory = () => {
			historyContainer.empty();
			historyContainer.appendChild(div("mausritter-subtitle", ["Roll History"]));
			const entries = [...state.history].reverse().slice(0, 20);
			for (const entry of entries) {
				const line = div("mausritter-dice-entry", [
					span("mausritter-dice-notation", entry.notation),
					span("mausritter-dice-rolls", `[${entry.rolls.join(", ")}]`),
					span("mausritter-dice-total", `= ${entry.total}`),
				]);
				if (entry.label) {
					line.appendChild(span("mausritter-dice-label", entry.label));
				}
				historyContainer.appendChild(line);
			}
		};
		renderHistory();
		container.appendChild(historyContainer);

		const addResult = (result: DiceResult, label?: string) => {
			state.history.push({
				notation: result.notation,
				rolls: result.rolls,
				total: result.total,
				timestamp: Date.now(),
				label,
			});
			if (state.history.length > 50) {
				state.history = state.history.slice(-50);
			}
			renderHistory();
			updateState(state);
		};
	}
}
