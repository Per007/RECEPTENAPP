// De bereiding is vrije tekst met één stap per regel. Voor de weergave maken we er
// losse, genummerde stappen van. De opgeslagen tekst zelf blijft ongewijzigd.

/** "1. ", "2) ", "3 - ", "4: ", "Stap 5:", "stap 6 ", "- " of "• " aan het begin van een regel. */
const STEP_PREFIX = /^(?:stap\s*\d+\s*[.):-]?\s+|\d+\s*(?:[.)]|\s-|:)\s+|[-•*]\s+)/i;

/** Splitst de bereiding in stappen, zonder lege regels en zonder eigen nummering. */
export function splitSteps(instructions: string | undefined): string[] {
	if (!instructions) return [];
	return instructions
		.split(/\r?\n/)
		.map((line) => line.trim().replace(STEP_PREFIX, '').trim())
		.filter((line) => line.length > 0);
}
