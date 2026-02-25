export interface WeatherEntry {
	description: string;
	isPoor: boolean;
}

// SRD 2d6 weather tables per season
// Poor weather: STR save or gain Exhausted Condition per Watch spent traveling
export const weatherTable: Record<string, WeatherEntry[]> = {
	spring: [
		{ description: "Rain storm", isPoor: true },       // 2
		{ description: "Drizzle", isPoor: false },          // 3-5
		{ description: "Overcast", isPoor: false },         // 6-8
		{ description: "Bright and sunny", isPoor: false }, // 9-11
		{ description: "Clear and warm", isPoor: false },   // 12
	],
	summer: [
		{ description: "Thunder storm", isPoor: true },     // 2
		{ description: "Very hot", isPoor: true },          // 3-5
		{ description: "Clear, hot", isPoor: false },       // 6-8
		{ description: "Pleasantly sunny", isPoor: false }, // 9-11
		{ description: "Beautifully warm", isPoor: false }, // 12
	],
	autumn: [
		{ description: "Wild winds", isPoor: true },        // 2
		{ description: "Heavy rain", isPoor: true },        // 3-5
		{ description: "Cool", isPoor: false },             // 6-8
		{ description: "Patchy rain", isPoor: false },      // 9-11
		{ description: "Clear and crisp", isPoor: false },  // 12
	],
	winter: [
		{ description: "Snow storm", isPoor: true },        // 2
		{ description: "Sleet", isPoor: true },             // 3-5
		{ description: "Bitter cold", isPoor: true },       // 6-8
		{ description: "Overcast", isPoor: false },         // 9-11
		{ description: "Clear and crisp", isPoor: false },  // 12
	],
};

// Maps 2d6 result (2-12) to index in the 5-entry weather array
// 2 → 0, 3-5 → 1, 6-8 → 2, 9-11 → 3, 12 → 4
export function weatherIndexFrom2d6(total: number): number {
	if (total <= 2) return 0;
	if (total <= 5) return 1;
	if (total <= 8) return 2;
	if (total <= 11) return 3;
	return 4;
}

export const seasonalEventsTable: Record<string, string[]> = {
	spring: [
		"Flooding washes away an important landmark",
		"Mother bird, very protective of her eggs",
		"Merchant's cart sunken in a pool of mud",
		"Migrating butterflies, hungry for nectar",
		"Mice weaving wreathes of flowers to prepare for...",
		"Wedding festival, a joyous procession",
	],
	summer: [
		"Heat wave makes travel exhausting for next week",
		"Baby bird, fallen from nest",
		"Pleasant and refreshing sun shower",
		"Swarm of locusts destroy a settlement's crops",
		"Mice building elaborate costumes to prepare for...",
		"Midsummer festival, a wild dance",
	],
	autumn: [
		"An important tree is felled by wild winds",
		"Mother bird, distraught from children leaving home",
		"A large patch of mushrooms emerges overnight",
		"Rumors that truffles are growing nearby",
		"Mice carrying bundles of grain and baking pies for...",
		"Harvest festival, a grand feast",
	],
	winter: [
		"Snow prevents above-ground movement for a week",
		"Bird with a broken wing, old and grey",
		"Lost migrating duck, separated by the flock",
		"Travellers disappear in a fast moving storm",
		"Mice building an effigy of old Winter to prepare for...",
		"Midwinter festival, a magnificent bonfire",
	],
};
