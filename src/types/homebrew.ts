import { Creature } from "./creature";
import { Item } from "./character";
import { NPC } from "./generator";

export interface HomebrewData {
	creatures?: Creature[];
	items?: Omit<Item, "equipped">[];
	npcs?: NPC[];
	names?: string[];
	"adventure-seeds"?: string[];
	weather?: Record<string, string[]>;
	landmarks?: Record<string, string[]>;
	"settlement-details"?: string[];
	"notable-features"?: string[];
	industries?: string[];
	events?: string[];
	"spark-actions"?: string[];
	"spark-subjects"?: string[];
}
