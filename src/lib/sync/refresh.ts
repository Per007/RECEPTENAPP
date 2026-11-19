// Haalt opnieuw op wanneer een ander apparaat iets gewijzigd kan hebben.
// Op een tablet volstaat "weer zichtbaar", maar op een pc blijft een tabblad vaak gewoon
// open staan: dan helpen alleen focus en een vaste tussenpoos.

/** Zo vaak wordt opgehaald zolang de app zichtbaar is. */
export const REFRESH_INTERVAL_MS = 60_000;

/** Start het automatisch ophalen; geeft een functie terug die het weer stopt. */
export function startAutoRefresh(load: () => unknown): () => void {
	const loadIfVisible = () => {
		if (document.visibilityState === 'visible') load();
	};

	window.addEventListener('focus', loadIfVisible);
	document.addEventListener('visibilitychange', loadIfVisible);
	const timer = setInterval(loadIfVisible, REFRESH_INTERVAL_MS);

	return () => {
		window.removeEventListener('focus', loadIfVisible);
		document.removeEventListener('visibilitychange', loadIfVisible);
		clearInterval(timer);
	};
}
