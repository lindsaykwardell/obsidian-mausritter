import { AdventureSite, AdventureSiteRoom } from "../types/generator";
import {
	constructions,
	ruinActions,
	ruinations,
	inhabitants,
	inhabitantActions,
	inhabitantGoals,
	secretHiddens,
	secrets,
	emptyRoomDescriptions,
	obstacleDescriptions,
	trapDescriptions,
	puzzleDescriptions,
	lairDescriptions,
	creatureThresholds,
	treasureThresholds,
	siteNameAdjectives,
	siteNameNouns,
} from "../data/adventure-sites";
import { roll } from "./dice";

const GRID_SIZE = 6;

function pick<T>(arr: T[]): T {
	return arr[roll(arr.length) - 1];
}

function shuffle<T>(arr: T[]): T[] {
	const a = [...arr];
	for (let i = a.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[a[i], a[j]] = [a[j], a[i]];
	}
	return a;
}

function getRoomType(): string {
	const r = roll(6);
	if (r <= 2) return "Empty";
	if (r === 3) return "Obstacle";
	if (r === 4) return "Trap";
	if (r === 5) return "Puzzle";
	return "Lair";
}

function getRoomDescription(type: string): string {
	switch (type) {
		case "Empty": return pick(emptyRoomDescriptions);
		case "Obstacle": return pick(obstacleDescriptions);
		case "Trap": return pick(trapDescriptions);
		case "Puzzle": return pick(puzzleDescriptions);
		case "Lair": return pick(lairDescriptions);
		default: return "";
	}
}

/** Place 3-4 key rooms randomly on the grid, then connect them with corridors. */
function buildSiteLayout(): [number, number][] {
	const key = (r: number, c: number) => `${r},${c}`;
	const occupied = new Set<string>();
	const positions: [number, number][] = [];

	// Place 3-4 key rooms at random positions, spread apart
	const keyRoomCount = roll(2) + 2; // 3-4
	const allCells = shuffle(
		Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i): [number, number] =>
			[Math.floor(i / GRID_SIZE), i % GRID_SIZE]
		)
	);

	// Pick key rooms that have some minimum distance from each other
	for (const cell of allCells) {
		if (positions.length >= keyRoomCount) break;
		const [r, c] = cell;
		// Ensure at least Manhattan distance 2 from all placed rooms
		const tooClose = positions.some(([pr, pc]) => Math.abs(pr - r) + Math.abs(pc - c) < 2);
		if (!tooClose) {
			occupied.add(key(r, c));
			positions.push([r, c]);
		}
	}

	// Fallback: if distance constraint prevented placing enough, relax it
	if (positions.length < keyRoomCount) {
		for (const cell of allCells) {
			if (positions.length >= keyRoomCount) break;
			const [r, c] = cell;
			if (!occupied.has(key(r, c))) {
				occupied.add(key(r, c));
				positions.push([r, c]);
			}
		}
	}

	// Connect key rooms with corridors
	// Walk through them in order, connecting each to the next
	for (let i = 0; i < positions.length - 1; i++) {
		const [r1, c1] = positions[i];
		const [r2, c2] = positions[i + 1];
		carveCorridor(r1, c1, r2, c2, occupied, positions);
	}

	return positions;
}

/** Carve an L-shaped corridor between two points, adding cells that aren't already occupied. */
function carveCorridor(
	r1: number, c1: number, r2: number, c2: number,
	occupied: Set<string>, positions: [number, number][]
): void {
	const key = (r: number, c: number) => `${r},${c}`;

	// Randomly choose whether to go horizontal-first or vertical-first
	const horizontalFirst = roll(2) === 1;

	const steps: [number, number][] = [];

	if (horizontalFirst) {
		// Move horizontally from c1 to c2 at row r1
		const cStep = c2 > c1 ? 1 : -1;
		for (let c = c1; c !== c2; c += cStep) {
			steps.push([r1, c + cStep]);
		}
		// Move vertically from r1 to r2 at column c2
		const rStep = r2 > r1 ? 1 : -1;
		for (let r = r1; r !== r2; r += rStep) {
			steps.push([r + rStep, c2]);
		}
	} else {
		// Move vertically first
		const rStep = r2 > r1 ? 1 : -1;
		for (let r = r1; r !== r2; r += rStep) {
			steps.push([r + rStep, c1]);
		}
		// Move horizontally
		const cStep = c2 > c1 ? 1 : -1;
		for (let c = c1; c !== c2; c += cStep) {
			steps.push([r2, c + cStep]);
		}
	}

	for (const [r, c] of steps) {
		if (!occupied.has(key(r, c))) {
			occupied.add(key(r, c));
			positions.push([r, c]);
		}
	}
}

export function generateAdventureSite(): AdventureSite {
	const name = `${pick(siteNameAdjectives)} ${pick(siteNameNouns)}`;
	const construction = pick(constructions);
	const ruinAction = pick(ruinActions);
	const ruination = pick(ruinations);
	const inhabitant = pick(inhabitants);
	const inhabitantAction = pick(inhabitantActions);
	const inhabitantGoal = pick(inhabitantGoals);
	const secretHidden = pick(secretHiddens);
	const secret = pick(secrets);

	const positions = buildSiteLayout();

	const rooms: AdventureSiteRoom[] = positions.map(([row, col], i) => {
		const type = getRoomType();
		const description = getRoomDescription(type);
		const creature = roll(6) <= (creatureThresholds[type] ?? 0);
		const treasure = roll(6) <= (treasureThresholds[type] ?? 0);
		return { id: i + 1, row, col, type, description, creature, treasure };
	});

	return {
		name, construction, ruinAction, ruination,
		inhabitant, inhabitantAction, inhabitantGoal,
		secretHidden, secret,
		rooms, gridRows: GRID_SIZE, gridCols: GRID_SIZE, selectedRoom: -1, partyMembers: [],
	};
}
