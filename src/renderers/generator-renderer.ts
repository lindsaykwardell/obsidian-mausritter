import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { Settlement, Hex, NPC, Hireling, WeatherResult, AdventureSeed } from "../types/generator";
import { HomebrewData } from "../types/homebrew";
import { HomebrewRegistry } from "../engine/homebrew";
import { roll, d6 } from "../engine/dice";
import {
	settlementDetails, notableFeatures, industries, events,
	tavernFirstNames, tavernSecondNames, tavernSpecialties,
	getGovernance, sizeDescription
} from "../data/settlements";
import { landmarks, landmarkDetails } from "../data/landmarks";
import { mouseNames, settlementStartNames, settlementEndNames } from "../data/names";
import { generateNPC as generateNPCFromEngine } from "../engine/hexmap";
import { adventureSeeds } from "../data/adventure-seeds";
import { weatherTable } from "../data/weather";
import { div, button, span, el } from "../utils/dom-helpers";

type GeneratorType = "settlement" | "hex" | "npc" | "hireling" | "name" | "weather" | "adventure-seed";

interface GeneratorState {
	selectedType: GeneratorType;
	results: Array<{ type: string; data: any; timestamp: number }>;
}

export class GeneratorRenderer extends BaseRenderer<GeneratorState> {
	protected blockType = "mausritter-generator";
	private homebrew: HomebrewRegistry;

	constructor(plugin: Plugin, homebrew: HomebrewRegistry) {
		super(plugin);
		this.homebrew = homebrew;
	}

	protected render(
		container: HTMLElement,
		data: GeneratorState | null,
		updateState: (data: GeneratorState) => void
	): void {
		const state: GeneratorState = data ?? { selectedType: "settlement", results: [] };

		container.addClass("mausritter-generator");
		container.appendChild(div("mausritter-title", ["Generator"]));

		// Type selector
		const controls = div("mausritter-generator-controls");
		const select = el("select", { class: "mausritter-select" }) as HTMLSelectElement;
		const types: [GeneratorType, string][] = [
			["settlement", "Settlement"],
			["hex", "Hex"],
			["npc", "NPC"],
			["hireling", "Hireling"],
			["name", "Mouse Name"],
			["weather", "Weather"],
			["adventure-seed", "Adventure Seed"],
		];
		for (const [value, label] of types) {
			const opt = el("option", { value }, [label]);
			if (value === state.selectedType) (opt as HTMLOptionElement).selected = true;
			select.appendChild(opt);
		}
		select.addEventListener("change", () => {
			state.selectedType = select.value as GeneratorType;
		});
		controls.appendChild(select);

		controls.appendChild(
			button("Generate", async () => {
				const hb = await this.homebrew.getData();
				const result = this.generate(state.selectedType, hb);
				state.results.unshift({ type: state.selectedType, data: result, timestamp: Date.now() });
				if (state.results.length > 20) state.results = state.results.slice(0, 20);
				updateState(state);
			}, "mausritter-btn mausritter-btn-primary")
		);

		controls.appendChild(
			button("Clear", () => {
				state.results = [];
				updateState(state);
			}, "mausritter-btn")
		);

		container.appendChild(controls);

		// Results
		const resultsContainer = div("mausritter-generator-results");
		for (const result of state.results) {
			resultsContainer.appendChild(this.renderResult(result.type, result.data));
		}
		container.appendChild(resultsContainer);
	}

	private generate(type: GeneratorType, hb: HomebrewData): any {
		switch (type) {
			case "settlement": return this.generateSettlement(hb);
			case "hex": return this.generateHex(hb);
			case "npc": return this.generateNPC(hb);
			case "hireling": return this.generateHireling(hb);
			case "name": return this.generateName(hb);
			case "weather": return this.generateWeather(hb);
			case "adventure-seed": return this.generateAdventureSeed(hb);
		}
	}

	private pick<T>(arr: T[]): T {
		return arr[Math.floor(Math.random() * arr.length)];
	}

	private generateSettlement(hb: HomebrewData): Settlement {
		const roll1 = d6(), roll2 = d6();
		const size = Math.min(roll1, roll2);

		const allDetails = [...settlementDetails, ...(hb["settlement-details"] ?? [])];
		const allFeatures = [...notableFeatures, ...(hb["notable-features"] ?? [])];
		const allIndustries = [...industries, ...(hb.industries ?? [])];
		const allEvents = [...events, ...(hb.events ?? [])];

		const npcs: NPC[] = [];
		const npcCount = size >= 4 ? 2 : 1;
		for (let i = 0; i < npcCount; i++) {
			npcs.push(this.generateNPC(hb));
		}

		return {
			name: this.pick(settlementStartNames) + this.pick(settlementEndNames),
			population: `${sizeDescription(size)} (size ${size})`,
			disposition: this.pick(allDetails),
			feature: this.pick(allFeatures),
			industry: this.pick(allIndustries),
			event: this.pick(allEvents),
			npcs,
		};
	}

	private generateHex(hb: HomebrewData): Hex {
		const terrainRoll = d6();
		let terrain: string;
		if (terrainRoll <= 2) terrain = "countryside";
		else if (terrainRoll <= 4) terrain = "forest";
		else if (terrainRoll === 5) terrain = "river";
		else terrain = "human town";

		// Merge homebrew landmarks for this terrain
		const builtinLandmarks = landmarks[terrain] ?? landmarks.countryside;
		const customLandmarks = hb.landmarks?.[terrain] ?? [];
		const allLandmarks = [...builtinLandmarks, ...customLandmarks];
		const landmark = this.pick(allLandmarks);

		const detailOuter = Math.floor(Math.random() * 6);
		let description = "";
		if (detailOuter > 0 && landmarkDetails[detailOuter]) {
			const inner = Math.floor(Math.random() * landmarkDetails[detailOuter].length);
			description = landmarkDetails[detailOuter][inner] ?? "";
		}

		return {
			terrain,
			landmark,
			feature: { type: terrain, description },
		};
	}

	private generateNPC(hb: HomebrewData): NPC {
		// Check if homebrew has full NPC entries to sometimes pick from
		const customNPCs = hb.npcs ?? [];
		if (customNPCs.length > 0 && Math.random() < customNPCs.length / (customNPCs.length + 20)) {
			return { ...this.pick(customNPCs) };
		}

		const npc = generateNPCFromEngine();

		// Override name with homebrew names if available
		const allNames = [...mouseNames, ...(hb.names ?? [])];
		npc.name = this.pick(allNames);

		return npc;
	}

	private generateHireling(hb: HomebrewData): Hireling {
		const allNames = [...mouseNames, ...(hb.names ?? [])];
		const skills = [
			"Torchbearer", "Porter", "Cook", "Scout",
			"Guard", "Guide", "Healer", "Forager",
		];
		return {
			name: this.pick(allNames),
			hp: d6(),
			str: d6() + d6(),
			dex: d6() + d6(),
			wil: d6() + d6(),
			skill: this.pick(skills),
			cost: `${d6()} pips/day`,
		};
	}

	private generateName(hb: HomebrewData): { name: string } {
		const allNames = [...mouseNames, ...(hb.names ?? [])];
		return { name: this.pick(allNames) };
	}

	private generateWeather(hb: HomebrewData): WeatherResult {
		// Merge homebrew weather entries per season
		const merged: Record<string, string[]> = {};
		for (const [season, entries] of Object.entries(weatherTable)) {
			merged[season] = [...entries, ...(hb.weather?.[season] ?? [])];
		}
		// Add any entirely new seasons from homebrew
		if (hb.weather) {
			for (const [season, entries] of Object.entries(hb.weather)) {
				if (!merged[season]) {
					merged[season] = entries;
				}
			}
		}

		const seasons = Object.keys(merged);
		const season = this.pick(seasons);
		return {
			season,
			weather: this.pick(merged[season]),
		};
	}

	private generateAdventureSeed(hb: HomebrewData): AdventureSeed {
		const allSeeds = [...adventureSeeds, ...(hb["adventure-seeds"] ?? [])];
		return { seed: this.pick(allSeeds) };
	}

	private renderResult(type: string, data: any): HTMLElement {
		const card = div("mausritter-generator-card");
		card.appendChild(div("mausritter-generator-type", [type.replace("-", " ").toUpperCase()]));

		switch (type) {
			case "settlement": {
				const s = data as Settlement;
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Name: "), span("", s.name)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Population: "), span("", s.population)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Disposition: "), span("", s.disposition)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Feature: "), span("", s.feature)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Industry: "), span("", s.industry)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Event: "), span("", s.event)
				]));
				if (s.npcs?.length) {
					for (const npc of s.npcs) {
						card.appendChild(div("mausritter-generator-field", [
							span("mausritter-label", "NPC: "),
							span("", `${npc.name} ${npc.lastName ?? ""} — ${npc.socialPosition ?? ""}, ${npc.birthsign ?? ""}. Wants: ${npc.want}`)
						]));
					}
				}
				break;
			}
			case "hex": {
				const h = data as Hex;
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Terrain: "), span("", h.terrain)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Landmark: "), span("", h.landmark)
				]));
				if (h.feature?.description) {
					card.appendChild(div("mausritter-generator-field", [
						span("mausritter-label", "Feature: "), span("", h.feature.description)
					]));
				}
				break;
			}
			case "npc": {
				const n = data as NPC;
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Name: "), span("", n.name)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Occupation: "), span("", n.occupation)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Trait: "), span("", n.trait)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Want: "), span("", n.want)
				]));
				break;
			}
			case "hireling": {
				const h = data as Hireling;
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Name: "), span("", h.name)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Stats: "),
					span("", `HP ${h.hp} | STR ${h.str} | DEX ${h.dex} | WIL ${h.wil}`)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Skill: "), span("", h.skill)
				]));
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", "Cost: "), span("", h.cost)
				]));
				break;
			}
			case "name": {
				card.appendChild(div("mausritter-generator-field mausritter-generator-name", [data.name]));
				break;
			}
			case "weather": {
				const w = data as WeatherResult;
				card.appendChild(div("mausritter-generator-field", [
					span("mausritter-label", `${w.season}: `), span("", w.weather)
				]));
				break;
			}
			case "adventure-seed": {
				const a = data as AdventureSeed;
				card.appendChild(div("mausritter-generator-field", [a.seed]));
				break;
			}
		}

		return card;
	}
}
