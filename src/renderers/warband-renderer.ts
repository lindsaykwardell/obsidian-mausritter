import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { WarbandData } from "../types/hireling";
import { generateWarband, rollMorale } from "../engine/hireling";
import { findCharacterSheets } from "../engine/vault-scanner";
import { rollSave, StatName } from "../engine/saves";
import { canLevelUp, levelUp } from "../engine/advancement";
import { div, button, span, el } from "../utils/dom-helpers";

export class WarbandRenderer extends BaseRenderer<WarbandData> {
	protected blockType = "mausritter-warband";
	private logOpen = false;

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: WarbandData | null,
		updateState: (data: WarbandData) => void
	): void {
		container.addClass("mausritter-warband");

		if (!data) {
			this.renderEmpty(container, updateState);
			return;
		}

		if (!data.log) data.log = [];

		this.renderWarband(container, data, updateState);
	}

	private renderEmpty(container: HTMLElement, updateState: (data: WarbandData) => void): void {
		const emptyDiv = div("mausritter-character-empty", [
			"No warband data. Form a warband!",
		]);
		container.appendChild(emptyDiv);
		container.appendChild(
			button("Form Warband", async () => {
				// Gather character last names from across the vault for thematic warband names
				const sheets = await findCharacterSheets(this.plugin);
				const vaultNames = sheets
					.map(s => s.name.split(" ").slice(-1)[0])
					.filter(Boolean);
				const warband = generateWarband(vaultNames);
				updateState(warband);
			}, "mausritter-btn mausritter-btn-primary")
		);
	}

	private renderWarband(
		container: HTMLElement,
		warband: WarbandData,
		updateState: (data: WarbandData) => void
	): void {
		// Header
		const header = div("mausritter-character-header");

		const headerTop = div("mausritter-character-header-top");
		const nameInput = el("input", { class: "mausritter-character-name", type: "text" }) as HTMLInputElement;
		nameInput.value = warband.name;
		nameInput.placeholder = "Warband name...";
		nameInput.addEventListener("change", () => {
			warband.name = nameInput.value;
			updateState(warband);
		});
		headerTop.appendChild(nameInput);

		// Action buttons
		const actionRow = div("mausritter-rest-row");

		actionRow.appendChild(
			button("Morale", () => {
				const result = rollMorale(warband);
				warband.routed = result.fled;
				warband.log.push(
					`Morale check: rolled ${result.roll} vs WIL ${result.wilValue} — ${result.fled ? "Routed!" : "Holds!"}`
				);
				updateState(warband);
			}, "mausritter-btn mausritter-btn-tiny")
		);

		if (canLevelUp(warband as any)) {
			actionRow.appendChild(
				button("Level Up!", () => {
					const result = levelUp(warband as any);
					if (result) {
						warband.log.push(...result.log);
						updateState(warband);
					}
				}, "mausritter-btn mausritter-btn-primary mausritter-btn-tiny")
			);
		}

		headerTop.appendChild(actionRow);
		header.appendChild(headerTop);

		// Info line
		const infoSpan = span("mausritter-character-info", `Level ${warband.level} Warband`);
		header.appendChild(infoSpan);

		// Routed badge
		if (warband.routed) {
			header.appendChild(span("mausritter-warband-routed-badge", "ROUTED"));
		}

		container.appendChild(header);

		// Stats row
		const statsRow = div("mausritter-stats-row");
		for (const statName of ["str", "dex", "wil"] as StatName[]) {
			statsRow.appendChild(this.renderStat(statName, warband, updateState));
		}
		container.appendChild(statsRow);

		// HP, Armour, Damage row
		const resourceRow = div("mausritter-resource-row");
		resourceRow.appendChild(this.renderHp(warband, updateState));
		resourceRow.appendChild(this.renderArmour(warband, updateState));
		resourceRow.appendChild(this.renderDamage(warband, updateState));
		container.appendChild(resourceRow);

		// Upkeep, XP row
		const resourceRow2 = div("mausritter-resource-row");
		resourceRow2.appendChild(this.renderUpkeep(warband, updateState));
		resourceRow2.appendChild(this.renderXp(warband, updateState));
		container.appendChild(resourceRow2);

		// Notes
		container.appendChild(this.renderNotes(warband, updateState));

		// Action log — collapsible
		const logDetails = document.createElement("details");
		logDetails.className = "mausritter-collapsible";
		if (this.logOpen) logDetails.open = true;
		logDetails.addEventListener("toggle", () => { this.logOpen = logDetails.open; });
		const logSummary = document.createElement("summary");
		logSummary.className = "mausritter-collapsible-summary";
		logSummary.textContent = "Action Log";
		logDetails.appendChild(logSummary);
		logDetails.appendChild(this.renderLog(warband));
		container.appendChild(logDetails);
	}

	// ---- Stat / Resource renderers ----

	private renderStat(statName: StatName, warband: WarbandData, updateState: (data: WarbandData) => void): HTMLElement {
		const stat = warband[statName];
		const box = div("mausritter-stat-box");
		box.appendChild(div("mausritter-stat-label", [statName.toUpperCase()]));
		const values = div("mausritter-stat-values");

		const currentInput = el("input", { class: "mausritter-stat-input mausritter-stat-current", type: "number" }) as HTMLInputElement;
		currentInput.value = String(stat.current);
		currentInput.addEventListener("change", () => {
			stat.current = parseInt(currentInput.value) || 0;
			// Auto-detect rout: at half STR or below
			if (statName === "str" && stat.current <= Math.floor(stat.max / 2) && stat.current > 0) {
				warband.log.push(`STR at half or below (${stat.current}/${stat.max}) — WIL save or routed!`);
			}
			updateState(warband);
		});

		const maxInput = el("input", { class: "mausritter-stat-input", type: "number" }) as HTMLInputElement;
		maxInput.value = String(stat.max);
		maxInput.addEventListener("change", () => { stat.max = parseInt(maxInput.value) || 0; updateState(warband); });

		values.appendChild(currentInput);
		values.appendChild(span("mausritter-stat-slash", "/"));
		values.appendChild(maxInput);
		box.appendChild(values);

		box.appendChild(
			button("Save", () => {
				const result = rollSave(warband as any, statName);
				warband.log.push(
					`${statName.toUpperCase()} save: rolled ${result.roll} vs ${result.statValue} — ${result.success ? "Success!" : "Failure!"}`
				);
				updateState(warband);
			}, "mausritter-btn mausritter-btn-tiny mausritter-btn-save")
		);

		return box;
	}

	private renderHp(warband: WarbandData, updateState: (data: WarbandData) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["HP"]));
		const values = div("mausritter-stat-values");

		const currentInput = el("input", { class: "mausritter-stat-input mausritter-stat-current", type: "number" }) as HTMLInputElement;
		currentInput.value = String(warband.hp.current);
		currentInput.addEventListener("change", () => {
			warband.hp.current = Math.max(0, parseInt(currentInput.value) || 0);
			updateState(warband);
		});

		const maxInput = el("input", { class: "mausritter-stat-input", type: "number" }) as HTMLInputElement;
		maxInput.value = String(warband.hp.max);
		maxInput.addEventListener("change", () => {
			warband.hp.max = Math.max(1, parseInt(maxInput.value) || 1);
			updateState(warband);
		});

		values.appendChild(currentInput);
		values.appendChild(span("mausritter-stat-slash", "/"));
		values.appendChild(maxInput);
		box.appendChild(values);
		return box;
	}

	private renderArmour(warband: WarbandData, updateState: (data: WarbandData) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["Armour"]));
		const input = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "number" }) as HTMLInputElement;
		input.value = String(warband.armour);
		input.addEventListener("change", () => {
			warband.armour = Math.max(0, parseInt(input.value) || 0);
			updateState(warband);
		});
		box.appendChild(input);
		return box;
	}

	private renderDamage(warband: WarbandData, updateState: (data: WarbandData) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["Damage"]));
		const input = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "text" }) as HTMLInputElement;
		input.value = warband.damage;
		input.addEventListener("change", () => {
			warband.damage = input.value.trim() || "d6";
			updateState(warband);
		});
		box.appendChild(input);
		return box;
	}

	private renderUpkeep(warband: WarbandData, updateState: (data: WarbandData) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["Upkeep"]));
		const input = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "number" }) as HTMLInputElement;
		input.value = String(warband.upkeepPerWeek);
		input.addEventListener("change", () => {
			warband.upkeepPerWeek = Math.max(0, parseInt(input.value) || 0);
			updateState(warband);
		});
		box.appendChild(input);
		box.appendChild(span("mausritter-resource-unit", "p/week"));
		return box;
	}

	private renderXp(warband: WarbandData, updateState: (data: WarbandData) => void): HTMLElement {
		const box = div("mausritter-resource-box");
		box.appendChild(div("mausritter-resource-label", ["XP"]));
		const xpInput = el("input", { class: "mausritter-stat-input mausritter-resource-input", type: "number" }) as HTMLInputElement;
		xpInput.value = String(warband.xp);
		xpInput.addEventListener("change", () => { warband.xp = parseInt(xpInput.value) || 0; updateState(warband); });
		box.appendChild(xpInput);
		return box;
	}

	private renderNotes(warband: WarbandData, updateState: (data: WarbandData) => void): HTMLElement {
		const section = div("mausritter-warband-notes");
		section.appendChild(div("mausritter-subtitle", ["Notes"]));
		const textarea = el("textarea", { class: "mausritter-warband-textarea" }) as HTMLTextAreaElement;
		textarea.value = warband.notes;
		textarea.placeholder = "Equipment, composition, special rules...";
		textarea.rows = 3;
		textarea.addEventListener("change", () => {
			warband.notes = textarea.value;
			updateState(warband);
		});
		section.appendChild(textarea);
		return section;
	}

	// ---- Log ----

	private renderLog(warband: WarbandData): HTMLElement {
		const logSection = div("mausritter-log");
		const entries = [...warband.log].reverse().slice(0, 20);
		for (const entry of entries) {
			logSection.appendChild(div("mausritter-log-entry", [entry]));
		}
		return logSection;
	}
}
