import { describe, it, expect, vi } from 'vitest';
import { syncFromServer, toLocal, type SyncDeps } from './sync';
import { ApiError, OfflineError } from '$lib/api/client';
import type { RemoteRecipe } from '$lib/api/types';
import type { Recipe } from '$lib/db/types';

function remote(id: string, overrides: Partial<RemoteRecipe> = {}): RemoteRecipe {
	return {
		id,
		title: `Recept ${id}`,
		category: 'soep',
		photoIds: [],
		isFavorite: false,
		createdAt: '2026-01-01T10:00:00.000Z',
		updatedAt: '2026-01-02T10:00:00.000Z',
		...overrides
	};
}

/** Nep-omgeving: een server-lijst en een lokale kopie in het geheugen. */
function setup(server: RemoteRecipe[], local: Recipe[] = []) {
	const store = new Map(local.map((r) => [r.id, r]));
	const deps = {
		listRemote: vi.fn(async () => server),
		downloadPhoto: vi.fn(async (id: string) => `data:${id}`),
		getAllLocal: vi.fn(async () => [...store.values()]),
		putLocal: vi.fn(async (r: Recipe) => void store.set(r.id, r)),
		deleteLocal: vi.fn(async (id: string) => void store.delete(id))
	} satisfies SyncDeps;
	return { deps, store };
}

describe('toLocal', () => {
	it('zet ISO-datums om naar Date en koppelt de fotos', () => {
		const local = toLocal(remote('A', { photoIds: ['p1'] }), ['data:p1']);
		expect(local.createdAt).toEqual(new Date('2026-01-01T10:00:00.000Z'));
		expect(local.updatedAt).toEqual(new Date('2026-01-02T10:00:00.000Z'));
		expect(local.photoIds).toEqual(['p1']);
		expect(local.photos).toEqual(['data:p1']);
		expect(local.title).toBe('Recept A');
	});
});

describe('syncFromServer', () => {
	it('neemt een recept over dat alleen op de server staat', async () => {
		const { deps } = setup([remote('A')]);
		const result = await syncFromServer(deps);
		expect(deps.putLocal).toHaveBeenCalledTimes(1);
		expect(result).toEqual([toLocal(remote('A'), [])]);
		expect(result[0].updatedAt).toBeInstanceOf(Date);
	});

	it('doet niets als het lokale recept even nieuw is', async () => {
		const { deps } = setup([remote('A', { photoIds: ['p1'] })], [
			toLocal(remote('A', { photoIds: ['p1'] }), ['data:p1'])
		]);
		await syncFromServer(deps);
		expect(deps.putLocal).not.toHaveBeenCalled();
		expect(deps.downloadPhoto).not.toHaveBeenCalled();
	});

	it('neemt een gewijzigd recept over zonder bekende fotos opnieuw te downloaden', async () => {
		const old = toLocal(remote('A', { photoIds: ['p1'] }), ['lokaal:p1']);
		const newer = remote('A', {
			photoIds: ['p1'],
			title: 'Nieuw',
			updatedAt: '2026-02-01T10:00:00.000Z'
		});
		const { deps, store } = setup([newer], [old]);
		await syncFromServer(deps);
		expect(deps.downloadPhoto).not.toHaveBeenCalled();
		expect(store.get('A')?.title).toBe('Nieuw');
		expect(store.get('A')?.photos).toEqual(['lokaal:p1']);
	});

	it('downloadt alleen de foto die het apparaat nog niet heeft, in de volgorde van de server', async () => {
		const old = toLocal(remote('A', { photoIds: ['p1'] }), ['lokaal:p1']);
		const newer = remote('A', { photoIds: ['p2', 'p1'], updatedAt: '2026-02-01T10:00:00.000Z' });
		const { deps, store } = setup([newer], [old]);
		await syncFromServer(deps);
		expect(deps.downloadPhoto).toHaveBeenCalledTimes(1);
		expect(deps.downloadPhoto).toHaveBeenCalledWith('p2');
		expect(store.get('A')?.photoIds).toEqual(['p2', 'p1']);
		expect(store.get('A')?.photos).toEqual(['data:p2', 'lokaal:p1']);
	});

	it('verwijdert lokaal wat op de server niet meer bestaat', async () => {
		const { deps, store } = setup([remote('A')], [
			toLocal(remote('A'), []),
			toLocal(remote('B'), [])
		]);
		const result = await syncFromServer(deps);
		expect(deps.deleteLocal).toHaveBeenCalledWith('B');
		expect(store.has('B')).toBe(false);
		expect(result.map((r) => r.id)).toEqual(['A']);
	});

	it.each([
		['een onbekende code (401)', new ApiError(401, 'unknown_code')],
		['geen verbinding', new OfflineError()]
	])('laat de lokale kopie met rust bij %s', async (_name, error) => {
		const { deps, store } = setup([], [toLocal(remote('A'), [])]);
		deps.listRemote.mockRejectedValue(error);
		await expect(syncFromServer(deps)).rejects.toBe(error);
		expect(deps.putLocal).not.toHaveBeenCalled();
		expect(deps.deleteLocal).not.toHaveBeenCalled();
		expect(store.has('A')).toBe(true);
	});

	it('slaat een recept over als een foto niet te downloaden is, en gaat door met de rest', async () => {
		const oldA = toLocal(remote('A'), []);
		const { deps, store } = setup(
			[
				remote('A', { photoIds: ['kapot'], updatedAt: '2026-02-01T10:00:00.000Z' }),
				remote('C', { photoIds: ['p3'] })
			],
			[oldA]
		);
		deps.downloadPhoto.mockImplementation(async (id: string) => {
			if (id === 'kapot') throw new OfflineError();
			return `data:${id}`;
		});
		const result = await syncFromServer(deps);
		expect(store.get('A')).toEqual(oldA);
		expect(store.get('C')?.photos).toEqual(['data:p3']);
		expect(result.map((r) => r.id).sort()).toEqual(['A', 'C']);
	});

	it('geeft de nieuwste recepten eerst terug', async () => {
		const { deps } = setup([
			remote('oud', { updatedAt: '2026-01-01T00:00:00.000Z' }),
			remote('nieuw', { updatedAt: '2026-03-01T00:00:00.000Z' })
		]);
		const result = await syncFromServer(deps);
		expect(result.map((r) => r.id)).toEqual(['nieuw', 'oud']);
	});
});
