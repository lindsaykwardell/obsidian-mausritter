export type OracleOutcome =
	| "yes-and"
	| "yes"
	| "complication"
	| "no-but"
	| "no"
	| "no-and";

export interface OracleEntry {
	question: string;
	roll: number;
	pressurePoint: number;
	outcome: OracleOutcome;
	timestamp: number;
}

export interface SparkResult {
	action: string;
	subject: string;
	timestamp: number;
}

export interface OracleState {
	pressurePoint: number;
	history: OracleEntry[];
	sparks: SparkResult[];
}
