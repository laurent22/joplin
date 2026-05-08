// Import this file in a test to set up a DOM environment.
// Use instead of jest-environment-jsdom in packages/lib.
//
// As of February 2026, jest-environment-jsdom can't be enabled
// for some tests in @joplin/lib without enabling it for all
// @joplin/lib tests. Jest's environment configuration comment
// (i.e. /** @jest-environment jsdom */) doesn't work in @joplin/lib
// due to the TypeScript/Jest configuration.
//
//
// This is similar to (but somewhat simpler than) the approach taken by
// "global-jsdom" package, which is recommended by the NodeJS native
// test runner documentation (https://nodejs.org/en/learn/test-runner/using-test-runner#user-interface-tests).
import { JSDOM } from 'jsdom';

const dom = new JSDOM(
	`
	<!DOCTYPE html>
	<html><body></body></html>	
`,
	{ url: 'http://localhost:8088/', pretendToBeVisual: true },
);

globalThis.window = dom.window as unknown as typeof window;

// Allow accessing document, Event, HTMLElement, etc. without the "window." prefix
Object.setPrototypeOf(globalThis, globalThis.window);
