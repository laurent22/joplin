/* eslint-disable multiline-comment-style */
/**
 * @jest-environment jsdom
 */
/* eslint-enable multiline-comment-style */

import { createEventHandlingListeners, Options } from './createEventHandlingAttrs';
import { describe, beforeAll, it, jest, expect } from '@jest/globals';

describe('createEventHandlingAttrs', () => {
	let lastMessage: string|undefined = undefined;
	const postMessageFn = (message: string) => {
		lastMessage = message;
	};

	beforeAll(() => {
		lastMessage = undefined;

		jest.useFakeTimers();
	});

	it('should not create listeners to handle long-press when long press is disabled', () => {
		const options: Options = {
			enableLongPress: false,
			postMessageSyntax: 'postMessageFn',
		};
		const listeners = createEventHandlingListeners('someresourceid', options, 'postMessage("click")');

		// Should not add touchstart/mouseenter/leave listeners when not long-pressing.
		expect(listeners.onmouseenter).toBe('');
		expect(listeners.onmouseleave).toBe('');
		expect(listeners.ontouchstart).toBe('');
		expect(listeners.ontouchmove).toBe('');
		expect(listeners.ontouchend).toBe('');
		expect(listeners.ontouchcancel).toBe('');
	});

	it('should create click listener for given click action', () => {
		const options: Options = {
			enableLongPress: false,
			postMessageSyntax: 'postMessageFn',
		};
		const clickAction = 'postMessageFn("click")';
		const listeners = createEventHandlingListeners('someresourceid', options, clickAction);
		expect(listeners.onclick).toContain(clickAction);

		postMessageFn('test');
		eval(listeners.onclick);
		expect(lastMessage).toBe('click');
	});

	it('should create ontouch listeners for long press', () => {
		const options: Options = {
			enableLongPress: true,
			postMessageSyntax: 'postMessageFn',
		};
		const clickAction: null|string = null;
		const listeners = createEventHandlingListeners('resourceidhere', options, clickAction);

		expect(listeners.onclick).toBe('');
		expect(listeners.ontouchstart).not.toBe('');

		// Clear lastMessage
		postMessageFn('test');

		eval(listeners.ontouchstart);
		jest.advanceTimersByTime(1000 * 4);

		expect(lastMessage).toBe('longclick:resourceidhere');
	});

	it('motion during a long press should cancel the timeout', () => {
		const options: Options = {
			enableLongPress: true,
			postMessageSyntax: 'postMessageFn',
		};
		const listeners = createEventHandlingListeners('id', options, null);

		lastMessage = '';
		eval(listeners.ontouchstart);
		jest.advanceTimersByTime(100);
		eval(listeners.ontouchmove);
		jest.advanceTimersByTime(1000 * 100);

		// Message handler should not have been called.
		expect(lastMessage).toBe('');
	});
});
