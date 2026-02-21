import { OracleOutcome, OracleEntry, SparkResult, OracleState } from "../types/oracle";
import { d20, roll } from "./dice";
import { sparkActions, sparkSubjects } from "../data/spark-tables";

export function createOracleState(): OracleState {
	return {
		pressurePoint: 10,
		history: [],
		sparks: [],
	};
}

/** Roll Yes/No oracle against the pressure point */
export function rollOracle(pressurePoint: number): { roll: number; outcome: OracleOutcome } {
	const r = d20();
	return { roll: r, outcome: resolveOutcome(r, pressurePoint) };
}

function resolveOutcome(r: number, pp: number): OracleOutcome {
	if (r <= pp - 5) return "yes-and";
	if (r <= pp - 1) return "yes";
	if (r === pp) return "complication";
	if (r <= pp + 4) return "no-but";
	if (r <= pp + 9) return "no";
	return "no-and";
}

export function outcomeLabel(outcome: OracleOutcome): string {
	switch (outcome) {
		case "yes-and": return "Yes, and...";
		case "yes": return "Yes";
		case "complication": return "Complication!";
		case "no-but": return "No, but...";
		case "no": return "No";
		case "no-and": return "No, and...";
	}
}

/** Roll on spark tables for open-ended questions, with optional extra entries */
export function rollSpark(
	extraActions?: string[],
	extraSubjects?: string[]
): SparkResult {
	const allActions = extraActions ? [...sparkActions, ...extraActions] : sparkActions;
	const allSubjects = extraSubjects ? [...sparkSubjects, ...extraSubjects] : sparkSubjects;
	const actionIndex = Math.floor(Math.random() * allActions.length);
	const subjectIndex = Math.floor(Math.random() * allSubjects.length);
	return {
		action: allActions[actionIndex],
		subject: allSubjects[subjectIndex],
		timestamp: Date.now(),
	};
}
