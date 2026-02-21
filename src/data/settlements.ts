export const settlementDetails: string[] = [
	"Shave elaborate patterns in their fur",
	"Intoxicated by strange plants",
	"Wary of doing business with outsiders",
	"Curious for news from afar",
	"Believe grooming their fur is bad luck",
	"Wear finely embroidered clothing",
	"Brew honey-mead, flavored with pungent herbs",
	"Cover their faces with long hoods",
	"Impoverished by a cat lord's tithes",
	"Ceremonially crop their tails",
	"Brave hunters of large beasts",
	"All descended from single matriarch",
	"Bake delicious berry pies",
	"Lab escapees, naive about the world",
	"Spend their days lazing by a stream",
	"Long-standing blood feud with another settlement",
	"Dig grand tunnels, overseen by the guild",
	"Wear large, wide-brimmed hats",
	"Have laws and customs confusing to outsiders",
	"On friendly terms with a predator",
];

export const notableFeatures: string[] = [
	"Maze of defensive, trap-filled tunnels",
	"Exceedingly comfortable, well-appointed inn",
	"Shrine carved of black wood",
	"Meditative mushroom garden",
	"Cow skull, repurposed as a guildhouse",
	"Mess of closely packed shanties",
	"Neat rows of hanging wooden houses",
	"Ornate gate, guarded by statues",
	"Secret bat cult temple",
	"Beetle racing rink",
	"Storehouse, stocked with preserves",
	"Hidden riverboat dock",
	"Crumbling marble palace, built by ancient mice",
	"Scavenged human machine, working",
	"Wooden bridge connects the settlement",
	"Unnervingly tall, twisting tower",
	"Beautiful flower garden",
	"Pigeon rider's roost",
	"Overgrown statue of an ancient hero",
	"Spiral stairwell, leading deep underground",
];

export const industries: string[] = [
	"Farmers, tending to towering crops",
	"Woodcutters, with saws and harnesses",
	"Rough and scarred fishermice, with nets and rafts",
	"Dark and musty mushroom farm",
	"Grains drying on every flat surface",
	"Pungent cheese, cured for years",
	"Gardens of rare herbs. Drying racks are guarded",
	"Hive of bees and their veiled keepers",
	"Merchants and traders, often in need of guards",
	"Stonemasons, working a nearby quarry",
	"Flour mill, driven by a large water-wheel",
	"Deep mine for iron, silver, or tin",
	"Keep silkworms and weave fine cloth",
	"Expert explorers of caves and tunnels",
	"Kiln-fired pottery, glazed in cheerful colours",
	"Wool mill, draped in bright cloth",
	"Excellent school, rowdy pupils",
	"Bustling, well-stocked market",
	"Smell scavenged trash pile, carefully picked over",
	"Beautiful furniture of carved and polished wood",
];

export const events: string[] = [
	"Disaster, everyone packing to leave",
	"Wedding, streets decked in flowers",
	"Preparing for grand seasonal feast",
	"An illness has struck",
	"Storehouse has been plundered by insects",
	"Market day, farmers flock to the settlement",
	"Mice are at each other's throats",
	"Warband forming to defeat a beast",
	"Several children have gone missing",
	"Noblemouse makes a frivolous demand",
	"Traveling theatre troupe has arrived",
	"Funeral, streets thick with smoke",
	"Conman whips up an irrational scheme",
	"Pet beetle gone mad, attacking mice",
	"Faerie emissary with an impossible request",
	"Strangely quick-growing plant nearby",
	"Valuable heirloom has been stolen",
	"Cat lord demands a heavy tithe",
	"Coming of age ceremony for the young mice",
	"Wizard tower arrives on tortoise-back",
];

export const tavernFirstNames: string[] = [
	"White", "Green", "Black", "Red", "Silver", "Crooked",
	"Friendly", "Hidden", "Wiley", "Glass", "Thorny", "Broken",
];

export const tavernSecondNames: string[] = [
	"Beetle", "Fox", "Wedge", "Kernel", "Rat", "Cheese",
	"Eagle", "Worm", "Bee", "Lantern", "Rose", "Knight",
];

export const tavernSpecialties: string[] = [
	"Spiced baked carrot", "Boiled worm broth", "Blackberry pie",
	"Pungent aged cheese", "Barley porridge", "Thick river-fish steak",
	"Baked apple", "Fried, crumbed insect legs", "Fresh buttered bread",
	"Scavenged candy", "Honey-roasted seeds", "Mushroom stew",
];

export function getGovernance(size: number, roll: number): string {
	const total = roll + size;
	if (total <= 3) return "Guided by village elders";
	if (total <= 5) return "Administered by a knight or lower-caste lord";
	if (total <= 7) return "Organized by guild committee";
	if (total <= 9) return "Free settlement, governed by council of burghermice";
	if (total <= 11) return "House of an upper caste noblemouse";
	return "Seat of baronial power";
}

export function sizeDescription(size: number): string {
	switch (size) {
		case 1: return "Farm/manor";
		case 2: return "Crossroads";
		case 3: return "Hamlet";
		case 4: return "Village";
		case 5: return "Town";
		default: return "City";
	}
}
