/** @jest-environment jsdom */

import { afterEach, describe, expect, jest, test } from '@jest/globals';
import makeSandboxedIframe from '@joplin/lib/utils/dom/makeSandboxedIframe';
import printHtmlInSandboxedIframe from './printHtmlInSandboxedIframe';

jest.mock('@joplin/lib/utils/dom/makeSandboxedIframe', () => jest.fn());

describe('printHtmlInSandboxedIframe', () => {
	afterEach(() => {
		jest.useRealTimers();
		jest.mocked(makeSandboxedIframe).mockReset();
		document.body.replaceChildren();
	});

	test('prints the exported HTML in a sandboxed iframe and cleans up after printing', () => {
		jest.useFakeTimers();
		const iframe = document.createElement('iframe');
		jest.mocked(makeSandboxedIframe).mockReturnValue({ iframe, loadPromise: Promise.resolve() });

		printHtmlInSandboxedIframe('<!DOCTYPE html><html><head><title>Note</title></head><body><p>Printable body</p></body></html>');

		const options = jest.mocked(makeSandboxedIframe).mock.calls[0][0];
		expect(options.headHtml).toContain('<title>Note</title>');
		expect(options.bodyHtml).toContain('<p>Printable body</p>');
		expect(options.scripts).toEqual(expect.arrayContaining([expect.stringContaining('window.print()')]));
		expect(options.scripts[0]).toContain('afterprint');
		expect(iframe.style.display).toBe('none');
		expect(iframe.isConnected).toBe(true);

		window.dispatchEvent(new MessageEvent('message', { source: window, data: { kind: 'note-print-finished' } }));
		expect(iframe.isConnected).toBe(true);
		window.dispatchEvent(new MessageEvent('message', { source: iframe.contentWindow, data: { kind: 'note-print-finished' } }));
		expect(iframe.isConnected).toBe(false);
	});

	test('cleans up if the browser does not fire afterprint', () => {
		jest.useFakeTimers();
		const iframe = document.createElement('iframe');
		jest.mocked(makeSandboxedIframe).mockReturnValue({ iframe, loadPromise: Promise.resolve() });

		printHtmlInSandboxedIframe('<p>Printable body</p>');
		expect(iframe.isConnected).toBe(true);
		jest.advanceTimersByTime(120_000);
		expect(iframe.isConnected).toBe(false);
	});
});
