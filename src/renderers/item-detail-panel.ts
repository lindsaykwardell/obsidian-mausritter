import { Character, Item, GridItem } from "../types/character";
import { spellTemplates } from "../data/spells";
import { swordPowers } from "../data/treasure";
import { castSpell, rechargeSpell } from "../engine/magic";
import { usageCheck } from "../engine/dice";
import { div, button, span } from "../utils/dom-helpers";

/** Known magic sword names from the SRD */
const MAGIC_SWORD_NAMES = new Set(swordPowers.map(s => s.name));

function isMagicSword(item: Item): boolean {
	return item.type === "weapon" && MAGIC_SWORD_NAMES.has(item.name);
}

/**
 * Unified detail panel for all items that need detail cards:
 * spells, magic swords, items with usage dots, and items with notable descriptions.
 */
export interface DetailPanelOptions {
	compact?: boolean; // hide recharge info (for combat cards)
}

export function renderItemDetailPanels(
	grids: GridItem[][],
	character: Character,
	updateState: (data: Character) => void,
	options?: DetailPanelOptions
): HTMLElement | null {
	const entries: GridItem[] = [];
	for (const grid of grids) {
		for (const entry of grid) {
			if (shouldShowDetail(entry.item)) {
				entries.push(entry);
			}
		}
	}

	if (entries.length === 0) return null;

	const section = div("mausritter-item-detail-panel");
	section.appendChild(div("mausritter-subtitle", ["Item Details"]));

	const cardsContainer = div("mausritter-item-detail-cards");
	for (const entry of entries) {
		cardsContainer.appendChild(renderDetailCard(entry.item, character, updateState, options));
	}
	section.appendChild(cardsContainer);

	return section;
}

export { isMagicSword };

function shouldShowDetail(item: Item): boolean {
	// Conditions never get detail cards
	if (item.type === "condition") return false;
	// Spells always get detail cards
	if (item.type === "spell") return true;
	// Anything with usage dots gets a detail card (weapons, armour, gear with usage)
	if (item.usage) return true;
	// Items with meaningful descriptions
	if (!item.description) return false;
	// Skip standard weapon/armour class labels
	if (/^(Light|Medium|Heavy|Ranged)(,.*)?$/.test(item.description)) return false;
	// Skip prices
	if (/^\d+p$/.test(item.description.trim())) return false;
	// Skip "N uses"
	if (/^\d+ uses?$/.test(item.description.trim())) return false;

	return true;
}

function renderDetailCard(
	item: Item,
	character: Character,
	updateState: (data: Character) => void,
	options?: DetailPanelOptions
): HTMLElement {
	if (item.type === "spell") {
		return renderSpellCard(item, character, updateState, options);
	}
	if (isMagicSword(item)) {
		return renderMagicSwordCard(item, character, updateState);
	}
	if (item.usage) {
		return renderUsageCard(item, character, updateState);
	}
	return renderGenericCard(item);
}

// ── Spell card ──

function renderSpellCard(
	item: Item,
	character: Character,
	updateState: (data: Character) => void,
	options?: DetailPanelOptions
): HTMLElement {
	const template = spellTemplates.find(t => t.name === item.name);
	const card = div("mausritter-item-detail-card mausritter-item-detail-card-spell");

	card.appendChild(span("mausritter-item-detail-card-name mausritter-item-detail-card-name-spell", item.name));

	if (template) {
		card.appendChild(div("mausritter-item-detail-card-desc", [template.description]));
		if (template.recharge && !options?.compact) {
			const rechargeEl = div("mausritter-spell-recharge");
			rechargeEl.appendChild(span("mausritter-label", "Recharge: "));
			rechargeEl.appendChild(span("", template.recharge));
			card.appendChild(rechargeEl);
		}
	}

	// Usage dots
	if (item.usage) {
		card.appendChild(renderUsageDots(item, character, updateState));
	}

	// Power selector
	let power = 1;
	const powerMatch = item.description?.match(/^power:(\d+)$/);
	if (powerMatch) power = parseInt(powerMatch[1]);

	const powerRow = div("mausritter-spell-power");
	powerRow.appendChild(span("mausritter-label", "Power: "));
	for (const p of [1, 2, 3]) {
		const diceLabel = `${p}d6`;
		const btn = button(diceLabel, () => {
			item.description = `power:${p}`;
			updateState(character);
		}, `mausritter-btn mausritter-btn-power ${power === p ? "mausritter-btn-power-active" : ""}`);
		powerRow.appendChild(btn);
	}
	card.appendChild(powerRow);

	// Cast & Recharge
	const isDepleted = item.usage ? item.usage.used >= item.usage.total : false;
	const castRow = div("mausritter-spell-cast");

	castRow.appendChild(
		button(isDepleted ? "Depleted" : "Cast", () => {
			if (isDepleted || !template || !item.usage) return;
			item.usage.used += 1;
			const result = castSpell(item.name, template.description, power);
			character.log.push(
				`Cast ${item.name} at power ${result.power}: [${result.dice.join(",")}] = ${result.sum}. ${result.resolvedText}`
			);
			if (result.miscast) {
				character.log.push(`MISCAST! Take ${result.miscastDamage} damage to WIL.`);
			}
			updateState(character);
		}, `mausritter-btn ${isDepleted ? "mausritter-btn-disabled" : "mausritter-btn-primary"}`)
	);

	castRow.appendChild(
		button("Recharge", () => {
			if (!item.usage || item.usage.used <= 0) return;
			const result = rechargeSpell();
			if (result.recharged) {
				item.usage.used = Math.max(0, item.usage.used - 1);
				character.log.push(`Recharge ${item.name}: rolled ${result.roll} — recovered a usage dot!`);
			} else {
				character.log.push(`Recharge ${item.name}: rolled ${result.roll} — no effect.`);
			}
			updateState(character);
		}, "mausritter-btn")
	);

	card.appendChild(castRow);

	return card;
}

// ── Magic sword card ──

function renderMagicSwordCard(
	item: Item,
	character: Character,
	updateState: (data: Character) => void
): HTMLElement {
	const card = div("mausritter-item-detail-card mausritter-item-detail-card-sword");

	card.appendChild(span("mausritter-item-detail-card-name mausritter-item-detail-card-name-sword", item.name));

	if (item.damage) {
		card.appendChild(span("mausritter-item-detail-card-stat", item.damage));
	}

	if (item.description) {
		card.appendChild(div("mausritter-item-detail-card-desc", [item.description]));
	}

	// Usage dots + check (magic swords only mark on natural 6)
	if (item.usage) {
		const usageRow = renderUsageDots(item, character, updateState);

		const resultLabel = span("mausritter-sword-check-result");

		const checkBtn = button("Check", () => {
			if (!item.usage) return;
			const result = usageCheck();
			if (result.roll === 6) {
				item.usage.used = Math.min(item.usage.total, item.usage.used + 1);
				character.log.push(`Usage check on ${item.name}: rolled ${result.roll} — mark dot! (only on 6)`);
				resultLabel.textContent = `Rolled ${result.roll} — marked!`;
				resultLabel.className = "mausritter-sword-check-result mausritter-sword-check-fail";
				if (item.usage.used >= item.usage.total) {
					character.log.push(`${item.name} is depleted!`);
				}
			} else {
				character.log.push(`Usage check on ${item.name}: rolled ${result.roll} — safe.`);
				resultLabel.textContent = `Rolled ${result.roll} — safe`;
				resultLabel.className = "mausritter-sword-check-result mausritter-sword-check-safe";
			}
			updateState(character);
		}, "mausritter-btn mausritter-btn-tiny");

		usageRow.appendChild(checkBtn);
		card.appendChild(usageRow);
		card.appendChild(resultLabel);
	}

	card.appendChild(div("mausritter-sword-note", ["Only marks usage on a natural 6"]));

	return card;
}

// ── Usage card (weapons, armour, ammunition, gear with usage) ──

function renderUsageCard(
	item: Item,
	character: Character,
	updateState: (data: Character) => void
): HTMLElement {
	const isWeaponOrArmour = item.type === "weapon" || item.type === "armour";
	const borderClass = item.type === "weapon" ? "mausritter-item-detail-card-weapon"
		: item.type === "armour" ? "mausritter-item-detail-card-armour"
		: "";
	const card = div(`mausritter-item-detail-card ${borderClass}`);

	const nameClass = item.type === "weapon" ? "mausritter-item-detail-card-name-weapon"
		: item.type === "armour" ? "mausritter-item-detail-card-name-armour"
		: "";
	card.appendChild(span(`mausritter-item-detail-card-name ${nameClass}`, item.name));

	if (item.damage) {
		card.appendChild(span("mausritter-item-detail-card-stat", item.damage));
	}
	if (item.defence) {
		card.appendChild(span("mausritter-item-detail-card-stat", `+${item.defence} Armour`));
	}
	if (item.description) {
		card.appendChild(div("mausritter-item-detail-card-desc", [item.description]));
	}

	// Usage dots + check
	if (item.usage) {
		const usageRow = renderUsageDots(item, character, updateState);

		const resultLabel = span("mausritter-sword-check-result");

		const checkBtn = button("Check", () => {
			if (!item.usage) return;
			const result = usageCheck();
			if (result.depleted) {
				item.usage.used = Math.min(item.usage.total, item.usage.used + 1);
				character.log.push(`Usage check on ${item.name}: rolled ${result.roll} — mark dot!`);
				resultLabel.textContent = `Rolled ${result.roll} — marked!`;
				resultLabel.className = "mausritter-sword-check-result mausritter-sword-check-fail";
				if (item.usage.used >= item.usage.total) {
					character.log.push(`${item.name} is depleted!`);
				}
			} else {
				character.log.push(`Usage check on ${item.name}: rolled ${result.roll} — safe.`);
				resultLabel.textContent = `Rolled ${result.roll} — safe`;
				resultLabel.className = "mausritter-sword-check-result mausritter-sword-check-safe";
			}
			updateState(character);
		}, "mausritter-btn mausritter-btn-tiny");

		usageRow.appendChild(checkBtn);
		card.appendChild(usageRow);
		card.appendChild(resultLabel);
	}

	if (isWeaponOrArmour) {
		card.appendChild(div("mausritter-sword-note", ["After a fight, roll d6 per item used. On 4-6, mark usage."]));
	}

	return card;
}

// ── Generic card (trinkets, unusual items without usage) ──

function renderGenericCard(item: Item): HTMLElement {
	const card = div("mausritter-item-detail-card");

	card.appendChild(span("mausritter-item-detail-card-name", item.name));

	if (item.damage) {
		card.appendChild(span("mausritter-item-detail-card-stat", item.damage));
	}
	if (item.defence) {
		card.appendChild(span("mausritter-item-detail-card-stat", `+${item.defence} Armour`));
	}

	card.appendChild(div("mausritter-item-detail-card-desc", [item.description!]));

	return card;
}

// ── Shared usage dot renderer ──

function renderUsageDots(
	item: Item,
	character: Character,
	updateState: (data: Character) => void
): HTMLElement {
	const usageRow = div("mausritter-usage-dots");
	if (!item.usage) return usageRow;

	for (let i = 0; i < item.usage.total; i++) {
		const dot = span(
			i < item.usage.used ? "mausritter-usage-dot mausritter-usage-used" : "mausritter-usage-dot"
		);
		dot.addEventListener("click", () => {
			if (!item.usage) return;
			item.usage.used = i < item.usage.used ? i : i + 1;
			updateState(character);
		});
		usageRow.appendChild(dot);
	}

	return usageRow;
}
