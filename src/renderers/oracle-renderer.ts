import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { OracleState } from "../types/oracle";
import { HomebrewRegistry } from "../engine/homebrew";
import { createOracleState, rollOracle, outcomeLabel, rollSpark } from "../engine/oracle";
import { div, button, span, el } from "../utils/dom-helpers";

export class OracleRenderer extends BaseRenderer<OracleState> {
	protected blockType = "mausritter-oracle";
	private homebrew: HomebrewRegistry;

	constructor(plugin: Plugin, homebrew: HomebrewRegistry) {
		super(plugin);
		this.homebrew = homebrew;
	}

	protected render(
		container: HTMLElement,
		data: OracleState | null,
		updateState: (data: OracleState) => void
	): void {
		const state: OracleState = data ?? createOracleState();

		container.addClass("mausritter-oracle");
		container.appendChild(div("mausritter-title", ["Einzelmaus Oracle"]));

		// Pressure Point
		const ppRow = div("mausritter-oracle-pp");
		ppRow.appendChild(span("mausritter-label", "Pressure Point: "));
		ppRow.appendChild(
			button("-", () => {
				state.pressurePoint = Math.max(1, state.pressurePoint - 1);
				updateState(state);
			}, "mausritter-btn mausritter-btn-tiny")
		);
		ppRow.appendChild(span("mausritter-oracle-pp-value", String(state.pressurePoint)));
		ppRow.appendChild(
			button("+", () => {
				state.pressurePoint = Math.min(20, state.pressurePoint + 1);
				updateState(state);
			}, "mausritter-btn mausritter-btn-tiny")
		);
		container.appendChild(ppRow);

		// Yes/No question
		const questionSection = div("mausritter-oracle-question");
		questionSection.appendChild(div("mausritter-subtitle", ["Yes/No Question"]));

		const questionInput = el("input", {
			class: "mausritter-oracle-input",
			type: "text",
		}) as HTMLInputElement;
		questionInput.placeholder = "Ask a yes/no question...";
		questionSection.appendChild(questionInput);

		questionSection.appendChild(
			button("Ask", () => {
				const question = questionInput.value.trim() || "Unnamed question";
				const result = rollOracle(state.pressurePoint);
				state.history.push({
					question,
					roll: result.roll,
					pressurePoint: state.pressurePoint,
					outcome: result.outcome,
					timestamp: Date.now(),
				});
				if (state.history.length > 100) {
					state.history = state.history.slice(-100);
				}
				questionInput.value = "";
				updateState(state);
			}, "mausritter-btn mausritter-btn-primary")
		);

		container.appendChild(questionSection);

		// Open-ended question (Spark Tables)
		const sparkSection = div("mausritter-oracle-spark");
		sparkSection.appendChild(div("mausritter-subtitle", ["Open-Ended Question"]));
		sparkSection.appendChild(
			button("Roll Spark Tables", async () => {
				const hb = await this.homebrew.getData();
				const spark = rollSpark(hb["spark-actions"], hb["spark-subjects"]);
				state.sparks.push(spark);
				if (state.sparks.length > 50) {
					state.sparks = state.sparks.slice(-50);
				}
				updateState(state);
			}, "mausritter-btn mausritter-btn-primary")
		);
		container.appendChild(sparkSection);

		// Outcome reference
		const refSection = div("mausritter-oracle-ref");
		refSection.appendChild(div("mausritter-subtitle", ["Outcome Table"]));
		const outcomes = [
			["Yes, and...", `Roll <= ${state.pressurePoint - 5}`, "mausritter-outcome-yes-and"],
			["Yes", `Roll ${state.pressurePoint - 4}-${state.pressurePoint - 1}`, "mausritter-outcome-yes"],
			["Complication!", `Roll = ${state.pressurePoint}`, "mausritter-outcome-complication"],
			["No, but...", `Roll ${state.pressurePoint + 1}-${state.pressurePoint + 4}`, "mausritter-outcome-no-but"],
			["No", `Roll ${state.pressurePoint + 5}-${state.pressurePoint + 9}`, "mausritter-outcome-no"],
			["No, and...", `Roll >= ${state.pressurePoint + 10}`, "mausritter-outcome-no-and"],
		];
		for (const [label, range, cls] of outcomes) {
			refSection.appendChild(div(`mausritter-oracle-ref-row ${cls}`, [
				span("mausritter-oracle-ref-label", label),
				span("mausritter-oracle-ref-range", range),
			]));
		}
		container.appendChild(refSection);

		// History
		const historySection = div("mausritter-oracle-history");
		historySection.appendChild(div("mausritter-subtitle", ["Oracle History"]));

		// Spark results first
		const recentSparks = [...state.sparks].reverse().slice(0, 10);
		for (const spark of recentSparks) {
			historySection.appendChild(div("mausritter-oracle-entry mausritter-oracle-spark-entry", [
				span("mausritter-oracle-spark-label", "Spark: "),
				span("mausritter-oracle-spark-result", `${spark.action} ${spark.subject}`),
			]));
		}

		// Yes/No results
		const recentHistory = [...state.history].reverse().slice(0, 20);
		for (const entry of recentHistory) {
			const outcomeClass = `mausritter-outcome-${entry.outcome}`;
			historySection.appendChild(div(`mausritter-oracle-entry ${outcomeClass}`, [
				span("mausritter-oracle-question-text", `"${entry.question}"`),
				span("mausritter-oracle-roll", `d20: ${entry.roll} vs PP ${entry.pressurePoint}`),
				span("mausritter-oracle-result", outcomeLabel(entry.outcome)),
			]));
		}
		container.appendChild(historySection);
	}
}
