import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { startAutoRefresh, REFRESH_INTERVAL_MS } from './refresh';

function setVisibility(state: DocumentVisibilityState) {
	Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
}

describe('startAutoRefresh', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		setVisibility('visible');
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('haalt op als het venster weer focus krijgt (pc: tabblad bleef zichtbaar)', () => {
		const load = vi.fn();
		const stop = startAutoRefresh(load);
		window.dispatchEvent(new Event('focus'));
		expect(load).toHaveBeenCalledTimes(1);
		stop();
	});

	it('haalt op als de app weer zichtbaar wordt', () => {
		const load = vi.fn();
		const stop = startAutoRefresh(load);
		document.dispatchEvent(new Event('visibilitychange'));
		expect(load).toHaveBeenCalledTimes(1);
		stop();
	});

	it('haalt regelmatig op zolang de app zichtbaar is', () => {
		const load = vi.fn();
		const stop = startAutoRefresh(load);
		vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 2);
		expect(load).toHaveBeenCalledTimes(2);
		stop();
	});

	it('haalt niet op als de app verborgen is', () => {
		setVisibility('hidden');
		const load = vi.fn();
		const stop = startAutoRefresh(load);
		vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 2);
		document.dispatchEvent(new Event('visibilitychange'));
		expect(load).not.toHaveBeenCalled();
		stop();
	});

	it('stopt na opruimen', () => {
		const load = vi.fn();
		startAutoRefresh(load)();
		window.dispatchEvent(new Event('focus'));
		vi.advanceTimersByTime(REFRESH_INTERVAL_MS * 2);
		expect(load).not.toHaveBeenCalled();
	});
});
