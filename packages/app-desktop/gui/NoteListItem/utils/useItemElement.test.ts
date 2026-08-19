import { act, renderHook } from '@testing-library/react';
import { ItemFlow } from '@joplin/lib/services/plugins/api/noteListType';
import useItemElement from './useItemElement';
import * as React from 'react';

const defaultProps = {
	noteId: 'note-1',
	noteHtml: '<span>Test content</span>',
	focusVisible: false,
	style: { height: '24px' } as React.CSSProperties,
	itemSize: { width: 200, height: 24 },
	onClick: jest.fn(),
	onDoubleClick: jest.fn(),
	flow: ItemFlow.TopToBottom,
};

const defaultItemEventHandlers = { onInputChange: jest.fn(), onClick: null as import('./types').OnClick | null };

describe('useItemElement', () => {
	let rootElement: HTMLDivElement;

	beforeEach(() => {
		rootElement = document.createElement('div');
		document.body.appendChild(rootElement);
		defaultProps.onClick.mockClear();
		defaultProps.onDoubleClick.mockClear();
	});

	afterEach(() => {
		rootElement.remove();
	});

	test('returns a ref (no setState, avoids "Maximum update depth exceeded")', () => {
		const { result } = renderHook(
			() => useItemElement(rootElement, defaultProps.noteId, defaultProps.noteHtml, defaultProps.focusVisible, defaultProps.style, defaultProps.itemSize, defaultProps.onClick, defaultProps.onDoubleClick, defaultProps.flow, defaultItemEventHandlers),
		);

		expect(result.current).toHaveProperty('current');
	});

	test('assigns created element to ref.current and cleanup nulls ref and removes element', () => {
		const { result, unmount } = renderHook(
			() => useItemElement(rootElement, defaultProps.noteId, defaultProps.noteHtml, false, defaultProps.style, defaultProps.itemSize, defaultProps.onClick, defaultProps.onDoubleClick, defaultProps.flow, defaultItemEventHandlers),
		);

		act(() => {});

		const el = result.current.current;
		expect(el).toBeInstanceOf(HTMLDivElement);
		expect(rootElement.contains(el)).toBe(true);

		unmount();

		expect(result.current.current).toBeNull();
		expect(rootElement.contains(el as Node)).toBe(false);
	});

	test('does nothing when rootElement is null', () => {
		const { result } = renderHook(
			() => useItemElement(null, defaultProps.noteId, defaultProps.noteHtml, false, defaultProps.style, defaultProps.itemSize, defaultProps.onClick, defaultProps.onDoubleClick, defaultProps.flow, defaultItemEventHandlers),
		);

		act(() => {});

		expect(result.current.current).toBeNull();
	});
});
