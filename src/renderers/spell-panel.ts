import { Character, Item, GridItem } from "../types/character";
import { spellTemplates } from "../data/spells";
import { castSpell, rechargeSpell } from "../engine/magic";
import { div, button, span } from "../utils/dom-helpers";

/**
 * Render inline spell cards for spell items found in inventory grids.
 * @param grids - the grids to scan for spell items
 * @param character - the character (for logging)
 * @param updateState - persistence callback
 */
export function renderSpellPanels(
	grids: GridItem[][],
	character: Character,
	updateState: (data: Character) => void
): HTMLElement | null {
	const spellEntries: GridItem[] = [];
	for (const grid of grids) {
		for (const entry of grid) {
			if (entry.item.type === "spell") {
				spellEntries.push(entry);
			}
		}
	}

	if (spellEntries.length === 0) return null;

	const section = div("mausritter-spell-panel");
	section.appendChild(div("mausritter-subtitle", ["Spells"]));

	const cardsContainer = div("mausritter-spell-cards");
	for (const entry of spellEntries) {
		cardsContainer.appendChild(renderSpellCard(entry.item, character, updateState));
	}
	section.appendChild(cardsContainer);

	return section;
}

function renderSpellCard(
	item: Item,
	character: Character,
	updateState: (data: Character) => void
): HTMLElement {
	const template = spellTemplates.find(t => t.name === item.name);
	const card = div("mausritter-spell-card");

	// Header
	card.appendChild(span("mausritter-spell-name", item.name));

	// Description
	if (template) {
		card.appendChild(div("mausritter-spell-desc", [template.description]));
	}

	// Usage dots
	if (item.usage) {
		const usageRow = div("mausritter-usage-dots");
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
		card.appendChild(usageRow);
	}

	// Power selector — store on item.description field as "power:N" or default to 1
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
