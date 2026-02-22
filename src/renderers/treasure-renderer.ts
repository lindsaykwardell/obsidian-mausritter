import { Plugin } from "obsidian";
import { BaseRenderer } from "./base-renderer";
import { TreasureHoard, TreasureItem } from "../types/generator";
import { generateTreasureHoard } from "../engine/treasure";
import { findCharacterSheets, giveItemToCharacter } from "../engine/vault-scanner";
import { div, button, span, el } from "../utils/dom-helpers";

const CATEGORY_COLORS: Record<string, string> = {
	"Magic Sword": "hsl(280, 60%, 55%)",
	"Spell": "hsl(260, 50%, 55%)",
	"Trinket": "hsl(170, 50%, 45%)",
	"Valuable": "hsl(45, 90%, 50%)",
	"Large": "hsl(20, 70%, 50%)",
	"Unusual": "hsl(320, 50%, 50%)",
	"Useful": "hsl(130, 50%, 45%)",
	"Pips": "hsl(50, 80%, 45%)",
};

export class TreasureRenderer extends BaseRenderer<TreasureHoard> {
	protected blockType = "mausritter-treasure";
	private editing = false;

	constructor(plugin: Plugin) {
		super(plugin);
	}

	protected render(
		container: HTMLElement,
		data: TreasureHoard | null,
		updateState: (data: TreasureHoard) => void
	): void {
		container.addClass("mausritter-treasure");

		if (!data || !data.items || data.items.length === 0) {
			this.renderEmpty(container, updateState);
			return;
		}

		if (this.editing) {
			this.renderEdit(container, data, updateState);
		} else {
			this.renderRead(container, data, updateState);
		}
	}

	private rerender(
		container: HTMLElement,
		data: TreasureHoard,
		updateState: (data: TreasureHoard) => void
	): void {
		container.empty();
		this.render(container, data, updateState);
	}

	// ── Empty state ──

	private renderEmpty(
		container: HTMLElement,
		updateState: (data: TreasureHoard) => void
	): void {
		const empty = div("mausritter-treasure-empty");
		empty.appendChild(
			div("mausritter-treasure-empty-text", ["No treasure hoard generated yet."])
		);

		const checkboxes = div("mausritter-treasure-checkboxes");

		const questions = [
			"Former mouse settlement, castle, or dungeon?",
			"Highly magical area?",
			"Defended by great beast or devious trap?",
			"Mice overcame great adversity?",
		];

		const checked = [false, false, false, false];

		for (let i = 0; i < questions.length; i++) {
			const label = el("label", { class: "mausritter-treasure-checkbox-label" });
			const cb = el("input", { type: "checkbox" });
			cb.addEventListener("change", () => {
				checked[i] = (cb as HTMLInputElement).checked;
			});
			label.appendChild(cb);
			label.appendChild(document.createTextNode(" " + questions[i]));
			checkboxes.appendChild(label);
		}

		empty.appendChild(checkboxes);

		empty.appendChild(
			button("Generate Treasure", () => {
				const bonusDice = checked.filter(Boolean).length;
				updateState(generateTreasureHoard(bonusDice));
			}, "mausritter-btn mausritter-btn-primary")
		);

		container.appendChild(empty);
	}

	// ── Read-only view ──

	private renderRead(
		container: HTMLElement,
		data: TreasureHoard,
		updateState: (data: TreasureHoard) => void
	): void {
		// Header
		const header = div("mausritter-treasure-header");
		header.appendChild(el("h3", { class: "mausritter-title" }, ["Treasure Hoard"]));

		const actions = div("mausritter-treasure-actions");
		actions.appendChild(
			button("Edit", () => {
				this.editing = true;
				this.rerender(container, data, updateState);
			}, "mausritter-btn mausritter-btn-small")
		);
		actions.appendChild(
			button("Regenerate", () => {
				updateState(generateTreasureHoard(data.bonusDice));
			}, "mausritter-btn mausritter-btn-small")
		);
		header.appendChild(actions);
		container.appendChild(header);

		// Item list
		const list = div("mausritter-treasure-list");

		for (let i = 0; i < data.items.length; i++) {
			const item = data.items[i];
			list.appendChild(this.renderItemCard(item, data, i, updateState, container));
		}

		container.appendChild(list);
	}

	private renderItemCard(
		treasureItem: TreasureItem,
		data: TreasureHoard,
		index: number,
		updateState: (data: TreasureHoard) => void,
		container: HTMLElement
	): HTMLElement {
		const isPickedUp = treasureItem.pickedUp === true;
		const cardCls = isPickedUp
			? "mausritter-treasure-card mausritter-treasure-card-picked-up"
			: "mausritter-treasure-card";
		const card = div(cardCls);

		// Category badge
		const color = CATEGORY_COLORS[treasureItem.category] || "hsl(0, 0%, 50%)";
		const badge = span("mausritter-treasure-badge", treasureItem.category);
		badge.style.backgroundColor = color;
		card.appendChild(badge);

		// Name
		card.appendChild(el("strong", { class: "mausritter-treasure-name" }, [treasureItem.name]));

		// Description
		if (treasureItem.description) {
			card.appendChild(div("mausritter-treasure-desc", [treasureItem.description]));
		}

		// Magic sword details
		if (treasureItem.category === "Magic Sword") {
			if (treasureItem.power) {
				card.appendChild(div("mausritter-treasure-power", [treasureItem.power]));
			}
			if (treasureItem.curse) {
				const curseDiv = div("mausritter-treasure-curse");
				curseDiv.appendChild(span("mausritter-treasure-curse-label", "Cursed: "));
				curseDiv.appendChild(document.createTextNode(treasureItem.curse.effect));
				curseDiv.appendChild(el("br"));
				curseDiv.appendChild(span("mausritter-treasure-curse-label", "Lifted by: "));
				curseDiv.appendChild(document.createTextNode(treasureItem.curse.liftedBy));
				card.appendChild(curseDiv);
			}
		}

		// Picked up indicator
		if (isPickedUp && treasureItem.pickedUpBy) {
			card.appendChild(
				div("mausritter-treasure-picked-up-label", [
					`Picked up by ${treasureItem.pickedUpBy}`,
				])
			);
		}

		// Give to button (only if not yet picked up)
		if (!isPickedUp) {
			const giveBtn = button("Give to...", async () => {
				const sheets = await findCharacterSheets(this.plugin);
				if (sheets.length === 0) {
					giveBtn.textContent = "No characters found";
					setTimeout(() => { giveBtn.textContent = "Give to..."; }, 2000);
					return;
				}

				// Show dropdown
				this.showGiveDropdown(giveBtn, sheets, treasureItem, data, index, updateState, container);
			}, "mausritter-btn mausritter-btn-tiny mausritter-treasure-give-btn");
			card.appendChild(giveBtn);
		}

		return card;
	}

	private showGiveDropdown(
		anchor: HTMLElement,
		sheets: { path: string; name: string }[],
		treasureItem: TreasureItem,
		data: TreasureHoard,
		index: number,
		updateState: (data: TreasureHoard) => void,
		container: HTMLElement
	): void {
		// Remove any existing dropdown
		const existing = container.querySelector(".mausritter-treasure-dropdown");
		if (existing) existing.remove();

		const dropdown = div("mausritter-treasure-dropdown");
		dropdown.style.position = "absolute";

		for (const sheet of sheets) {
			const option = button(sheet.name, async () => {
				const success = await giveItemToCharacter(this.plugin, sheet.path, { ...treasureItem.item });
				if (success) {
					data.items[index].pickedUp = true;
					data.items[index].pickedUpBy = sheet.name;
					updateState(data);
				}
				dropdown.remove();
			}, "mausritter-treasure-dropdown-option");
			dropdown.appendChild(option);
		}

		// Close on outside click
		const closeHandler = (e: MouseEvent) => {
			if (!dropdown.contains(e.target as Node) && e.target !== anchor) {
				dropdown.remove();
				document.removeEventListener("click", closeHandler);
			}
		};
		setTimeout(() => document.addEventListener("click", closeHandler), 0);

		anchor.parentElement?.appendChild(dropdown);
	}

	// ── Edit mode ──

	private renderEdit(
		container: HTMLElement,
		data: TreasureHoard,
		updateState: (data: TreasureHoard) => void
	): void {
		const header = div("mausritter-treasure-header");
		header.appendChild(el("h3", { class: "mausritter-title" }, ["Treasure Hoard (Editing)"]));

		const actions = div("mausritter-treasure-actions");
		actions.appendChild(
			button("Done", () => {
				this.editing = false;
				updateState(data);
			}, "mausritter-btn mausritter-btn-primary mausritter-btn-small")
		);
		header.appendChild(actions);
		container.appendChild(header);

		const list = div("mausritter-treasure-list");

		for (let i = 0; i < data.items.length; i++) {
			const item = data.items[i];
			const card = div("mausritter-treasure-card mausritter-treasure-card-edit");

			// Category badge
			const color = CATEGORY_COLORS[item.category] || "hsl(0, 0%, 50%)";
			const badge = span("mausritter-treasure-badge", item.category);
			badge.style.backgroundColor = color;
			card.appendChild(badge);

			// Name input
			const nameInput = el("input", { type: "text", class: "mausritter-treasure-input", value: item.name });
			nameInput.addEventListener("change", () => {
				item.name = (nameInput as HTMLInputElement).value;
				item.item.name = item.name;
			});
			card.appendChild(nameInput);

			// Description input
			const descInput = el("input", { type: "text", class: "mausritter-treasure-input", value: item.description || "" });
			descInput.addEventListener("change", () => {
				item.description = (descInput as HTMLInputElement).value;
				item.item.description = item.description;
			});
			card.appendChild(descInput);

			// Picked up toggle
			const pickedUpLabel = el("label", { class: "mausritter-treasure-checkbox-label" });
			const pickedUpCb = el("input", { type: "checkbox" });
			(pickedUpCb as HTMLInputElement).checked = item.pickedUp === true;
			pickedUpCb.addEventListener("change", () => {
				item.pickedUp = (pickedUpCb as HTMLInputElement).checked;
				if (!item.pickedUp) {
					item.pickedUpBy = undefined;
				}
			});
			pickedUpLabel.appendChild(pickedUpCb);
			pickedUpLabel.appendChild(document.createTextNode(" Picked up"));
			card.appendChild(pickedUpLabel);

			// Remove button
			card.appendChild(
				button("Remove", () => {
					data.items.splice(i, 1);
					updateState(data);
				}, "mausritter-btn mausritter-btn-tiny mausritter-btn-danger")
			);

			list.appendChild(card);
		}

		container.appendChild(list);

		// Add item button
		container.appendChild(
			button("+ Add Item", () => {
				data.items.push({
					name: "New item",
					description: "",
					category: "Useful",
					item: { name: "New item", type: "gear", slots: 1, width: 1, height: 1, description: "" },
				});
				updateState(data);
			}, "mausritter-btn mausritter-btn-small")
		);
	}
}
