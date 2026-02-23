export interface HirelingTemplate {
	type: string;
	wagesPerDay: number;
	numberDie: number;  // sides of the die for "how many available" roll
}

export const hirelingTemplates: HirelingTemplate[] = [
	{ type: "Torchbearer", wagesPerDay: 1, numberDie: 6 },
	{ type: "Labourer", wagesPerDay: 2, numberDie: 6 },
	{ type: "Tunnel digger", wagesPerDay: 5, numberDie: 4 },
	{ type: "Armourer/blacksmith", wagesPerDay: 8, numberDie: 2 },
	{ type: "Beast handler", wagesPerDay: 8, numberDie: 2 },
	{ type: "Mouse-at-arms", wagesPerDay: 10, numberDie: 6 },
	{ type: "Scholar", wagesPerDay: 20, numberDie: 2 },
	{ type: "Knight", wagesPerDay: 25, numberDie: 3 },
	{ type: "Interpreter", wagesPerDay: 30, numberDie: 2 },
];
