import { describe, it, expect } from 'vitest';
import { splitSteps } from './steps';

describe('splitSteps', () => {
	it('maakt van elke regel een stap en slaat lege regels over', () => {
		expect(splitSteps('Kook de erwten.\n\n  Snijd de groenten.  \n')).toEqual([
			'Kook de erwten.',
			'Snijd de groenten.'
		]);
	});

	it('haalt bestaande nummering weg, zodat er geen dubbele nummers staan', () => {
		expect(splitSteps('1. Verwarm de oven.\n2) Kneed het deeg.\n3 - Bak het.\n4: Klaar.')).toEqual([
			'Verwarm de oven.',
			'Kneed het deeg.',
			'Bak het.',
			'Klaar.'
		]);
	});

	it('haalt "Stap 1:" en opsommingstekens weg', () => {
		expect(splitSteps('Stap 1: Meng.\nstap 2 Klop.\n- Bak.\n• Serveer.')).toEqual([
			'Meng.',
			'Klop.',
			'Bak.',
			'Serveer.'
		]);
	});

	it('laat hoeveelheden aan het begin van een regel staan', () => {
		expect(splitSteps('2 eieren erdoor kloppen.\n1.5 kg appels schillen.\n10 minuten laten rusten.')).toEqual([
			'2 eieren erdoor kloppen.',
			'1.5 kg appels schillen.',
			'10 minuten laten rusten.'
		]);
	});

	it('geeft een lege lijst zonder bereiding', () => {
		expect(splitSteps(undefined)).toEqual([]);
		expect(splitSteps('  \n ')).toEqual([]);
	});

	it('werkt ook met Windows-regeleinden', () => {
		expect(splitSteps('Eerst dit.\r\nDan dat.')).toEqual(['Eerst dit.', 'Dan dat.']);
	});
});
