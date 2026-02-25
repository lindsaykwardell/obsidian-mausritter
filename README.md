# Mausritter for Obsidian

Play the [Mausritter](https://mausritter.com) tabletop RPG directly within [Obsidian](https://obsidian.md). This plugin provides interactive character sheets, hex maps, dice rollers, generators, and more — everything you need to run a full Mausritter campaign from your notes.

Based on the **Mausritter SRD v2.3** by Isaac Williams (Losing Games), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).

## Features

- **15 interactive block types** that render directly in your notes
- **Drag-and-drop inventory** with grid-based item management
- **Full hex map** with settlements, NPCs, constructions, and banking
- **Adventure site builder** with room stocking and party tracking
- **Dice roller, oracle, and generators** for solo or GM play
- **Built-in SRD rulebook** as a searchable sidebar panel
- **Homebrew support** for adding custom creatures, items, names, and more
- **Cross-sheet item transfers** between characters, hirelings, NPCs, and settlement banks

## Getting Started

Install the plugin, then use the command palette (`Ctrl/Cmd+P`) to insert any block type. Each block is a fenced code block (e.g. ` ```mausritter-character ``` `) that renders as an interactive widget.

### Commands

All 15 block types have an **Insert** command (e.g. `Insert character block`), plus:

- **Open rulebook** — Opens a searchable Mausritter SRD sidebar panel

## Block Types

### Character Sheet (`mausritter-character`)

Full interactive character sheet for player mice.

- **Character generation** — One-click creation with SRD-accurate backgrounds, birthsigns, coats, and physical details
- **Stat tracking** — Editable STR, DEX, WIL (current/max) with per-stat Save buttons
- **HP, Pips, XP** resource tracking
- **Grid inventory** — Paws (1x2), Body (1x2), and Pack (2x3) grids with full drag-and-drop. Items span their actual slot dimensions (1x1, 1x2, 2x1, 2x2). Swap items by dragging onto occupied cells; auto-rotate on failed placement
- **Ground staging area** for overflow items
- **Item actions** — Give to another entity, rotate, send to ground, delete. Usage dots on each item (click to mark/unmark)
- **Grit slots** — Appear at level 2+. Empty slots accept condition drops via drag-and-drop to absorb the condition's effect. Cleared only on full rest
- **Encumbrance warning** — Red banner when items overflow beyond inventory capacity
- **Add items** — Category browser (Weapons, Armour, Ammunition, Gear, Spells), custom item entry with size selector, and condition buttons (Exhausted, Frightened, Hungry, Injured, Sick, Drained)
- **Rest system** — Short Rest, Long Rest, and Full Rest buttons with logged results
- **Level Up** — Appears automatically when XP threshold is met
- **Action log** — Collapsible history of rolls, rests, and events (last 20 entries)

### Hireling Sheet (`mausritter-hireling`)

Track hired mice with the same inventory and stat system as characters.

- **Recruitment** — Type dropdown with SRD wages and availability dice, then generate
- **Morale** — Roll button (WIL save); marks hireling as FLED on failure
- **Wages tracking** — Editable pips/day cost
- **Inventory** — Same drag-and-drop grids as characters (slightly smaller pack: 1x2)
- **Encumbrance, grit, leveling, rests, and action log** — Same as character sheets

### Warband (`mausritter-warband`)

Track large groups of fighters as a single unit.

- **Stats** — HP, STR, DEX, WIL (current/max), Armour, Damage die
- **Morale** — Roll button (d20 vs WIL); auto-rout detection when STR drops to half
- **Upkeep** — Pips/week cost tracking
- **Notes** — Freeform text area
- **Level Up and action log**

### Hex Map (`mausritter-hexmap`)

Interactive 19-hex diamond grid matching the Mausritter rulebook layout.

- **Hex generation** — Each hex gets terrain, a landmark, and a description from SRD tables
- **Party marker** — Track which hex the party is in
- **Hex detail panel** — Click a hex to view/edit its name, terrain, landmark, and description
- **Settlements** — Generate settlements with SRD-accurate size, governance, details, features, industries, events, tavern names, and NPCs
- **Constructions** — Add tunnels, poor/standard/grand rooms with per-unit costs and 1% monthly upkeep calculation
- **Settlement banking** — Store pips (with 1% withdrawal fee) and items. Bank items render as inventory cards with "Give to" menus for withdrawals to characters/hirelings. Deposit via the "Give to" dropdown on character/hireling sheets when the party is at a settlement
- **NPCs** — Full character sheets embedded in settlements or hexes, with inventory, stats, and item transfer support
- **Regenerate** individual hexes or the entire map

### Hex Detail (`mausritter-hex`)

A read-only reference widget that displays a single hex's detail panel from another file's hex map. Useful for linking hex information into session notes.

### Adventure Site (`mausritter-adventure-site`)

Build and explore adventure dungeons.

- **Auto-generation** — Creates a site with SRD tables for construction, ruination, inhabitants, goals, and secrets
- **Grid map** — Rooms placed on a resizable grid with corridors connecting them
- **Room stocking** — Each room has a type (Empty, Obstacle, Trap, Puzzle, Lair), description, and creature/treasure flags
- **Party tracking** — Up to 6 color-coded party members can be placed and moved between rooms
- **Summary sentence** — Auto-generated overview of the site's theme
- **Edit mode** — Click to place new rooms, edit types and descriptions, toggle creature/treasure

### Faction (`mausritter-faction`)

Track faction resources, goals, and progression.

- **Generation** — Creates a faction with SRD-sourced name, resources, and goals
- **Progress tracks** — Clickable circles for each goal; "Complete!" indicator when finished
- **Progress rolls** — Inline calculator per goal: rolls d6, add own relevant resources (+1 each), subtract rival resources (-1 each). 4-5 = +1 progress, 6+ = +2 progress
- **New resources** — Button on completed goals to reward the faction
- **Edit mode** — Rename faction, add/remove resources and goals, adjust goal step counts

### Creature Tracker (`mausritter-creature`)

Run combat encounters with multiple creatures.

- **Template library** — 11 SRD creatures (Cat, Centipede, Crow, Faerie, Frog, Ghost, Mouse, Owl, Rat, Snake, Spider) plus homebrew
- **Per-creature cards** — Editable name, HP tracker, STR/DEX/WIL stats, armour, attacks with damage dice, critical damage effects, notes
- **KO/Revive toggle** — Visually mark incapacitated creatures
- **Multiple instances** — Track several creatures at once

### Combat Card (`mausritter-combat-card`)

A compact combat reference that links to an existing character or hireling sheet.

- **Auto-links** — Dropdown of characters/hirelings in the vault
- **Quick stats** — HP, STR/DEX/WIL with Save buttons
- **Equipped items** — Shows paw and body items with damage/defence info and usage check buttons
- **Active conditions** displayed as tags
- **Results logged** to the linked character's action log

### Spell Tracker (`mausritter-spell`)

Track active spells during play.

- **Full spell list** — All 15 SRD spells with descriptions and recharge conditions
- **Usage dots** — 3 dots per spell, click to mark/unmark
- **Power selector** — Choose 1, 2, or 3 power dice per cast
- **Cast button** — Rolls power dice, resolves effect text with [SUM] and [DICE], detects miscasts (any 6s rolled = WIL damage + Drained save)
- **Recharge button** — Roll to recover a usage dot
- **Cast/recharge log** per spell

### Treasure Hoard (`mausritter-treasure`)

Generate and distribute treasure.

- **Bonus dice** — Four SRD checkboxes (former settlement? highly magical? great beast/trap? great adversity?) adding +1 die each
- **Category-coded cards** — Magic Swords (with powers and optional curses), Spells, Trinkets, Valuables, Large Treasure, Unusual Treasure, Useful Treasure, Pips
- **Give to** — Transfer unclaimed items directly into a character's inventory
- **Edit mode** — Manually add/remove/edit treasure items

### Dice Roller (`mausritter-dice`)

General-purpose dice roller.

- **Quick roll** buttons for d4, d6, d8, d10, d12, d20
- **Advantage / Disadvantage / Normal** toggle
- **Attribute Save** — Configurable target number, reports success/failure
- **Usage Check** — Rolls d6; reports "Mark usage dot!" on 1-3 or "Safe" on 4-6
- **Persistent history** — Last 20 rolls displayed, up to 50 stored

### Oracle (`mausritter-oracle`)

Solo play tool for answering questions and generating prompts.

- **Pressure Point** — Adjustable threshold (1-20) that shifts yes/no probabilities
- **Yes/No questions** — Type a question, roll d20 against the Pressure Point. Six possible outcomes: Yes-and, Yes, Complication, No-but, No, No-and
- **Spark Tables** — Roll random Action + Subject word pairs for open-ended inspiration
- **Outcome reference table** — Shows current roll ranges at the active Pressure Point
- **Persistent history** of questions and spark results

### Generator (`mausritter-generator`)

Quick-roll generators for world building.

- **Settlement** — Name, population, disposition, feature, industry, event, embedded NPCs
- **Hex** — Terrain, landmark, optional feature
- **NPC** — Name, social position (with payment for service), birthsign, disposition, appearance, quirk, want, relationship, stats, items
- **Hireling** — Name, stats, skill type, wages
- **Name** — Random mouse name
- **Weather** — 2d6 roll per season (SRD bell curve distribution), poor weather flagged in red with STR save warning, plus a seasonal event (d6)
- **Adventure Seed** — Random hook from the d66 table
- **Encounter Check** — d6: encounter, omen, or nothing
- **Reaction Roll** — 2d6: hostile, unfriendly, unsure, talkative, or helpful (with GM prompts)

### Homebrew Data (`mausritter-data`)

Extend the plugin with custom content using YAML blocks.

```yaml
creatures:
  - name: Giant Beetle
    str: 8
    dex: 6
    wil: 2
    hp: 4
    armour: 2
    attacks:
      - name: Mandibles
        damage: d8
    notes: Crunchy shell
names:
  - Bramblesnout
  - Thistlepaw
weather:
  monsoon:
    - Torrential downpour
    - Muggy and humid
items:
  - name: Acorn Bomb
    damage: d8
    size: [1, 1]
```

All fields are optional. Homebrew data merges with built-in SRD content across all generators and selectors. Supported fields:

| Field | Type | Used in |
|-------|------|---------|
| `creatures` | Creature templates | Creature tracker |
| `items` | Item templates | Character/hireling "Add Item" |
| `npcs` | NPC summaries | Generator |
| `names` | Mouse names | Generator, NPC creation |
| `adventure-seeds` | Seed strings | Generator |
| `weather` | Season-keyed string arrays | Generator |
| `landmarks` | Terrain-keyed string arrays | Generator, hex map |
| `settlement-details` | Detail strings | Generator, hex map |
| `notable-features` | Feature strings | Generator, hex map |
| `industries` | Industry strings | Generator, hex map |
| `events` | Event strings | Generator, hex map |
| `spark-actions` | Action words | Oracle spark tables |
| `spark-subjects` | Subject words | Oracle spark tables |

## Cross-Sheet Item Transfers

Items can flow between entities throughout your vault:

- **Character/Hireling "Give to"** menu lists all other characters, hirelings, and (if the party is at a settlement) the settlement bank
- **Settlement bank "Give to"** menu lists all characters and hirelings for withdrawals
- **NPC "Give to"** menu transfers items to characters and hirelings
- **Treasure hoard "Give to"** places items directly into a character's inventory

## Built-in Rulebook

Use the **Open rulebook** command to open a searchable sidebar panel containing the full Mausritter SRD v2.3. Sections are organized by heading and can be filtered with the search bar.

## Development

```bash
npm install
npm run build        # Production build
npm run dev          # Watch mode
npm run test         # Run tests
```

## License

MIT

## Attribution

This work is based on [Mausritter](https://mausritter.com), a product of Losing Games and Isaac Williams, and is licensed for use under the [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/) licence.
