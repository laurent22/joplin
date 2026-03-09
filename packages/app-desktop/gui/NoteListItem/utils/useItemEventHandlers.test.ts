import { act, renderHook } from '@testing-library/react';
import useItemEventHandlers from './useItemEventHandlers';

describe('useItemEventHandlers', () => {
	let rootElement: HTMLDivElement;
	let itemElement: HTMLDivElement;
	const onInputChange = jest.fn();
	const onClick = jest.fn();

	beforeEach(() => {
		rootElement = document.createElement('div');
		itemElement = document.createElement('div');
		document.body.appendChild(rootElement);
		document.body.appendChild(itemElement);
		onInputChange.mockClear();
		onClick.mockClear();
	});

	afterEach(() => {
		rootElement.remove();
		itemElement.remove();
	});

	test('accepts ref and uses ref.current (as used by NoteListItem with useItemElement)', () => {
		const ref = { current: itemElement };
		const input = document.createElement('input');
		input.type = 'checkbox';
		itemElement.appendChild(input);

		renderHook(
			() => useItemEventHandlers(rootElement, ref, onInputChange, onClick, 'test-key'),
		);
		act(() => {});

		input.dispatchEvent(new Event('change', { bubbles: true }));
		expect(onInputChange).toHaveBeenCalledTimes(1);
	});

	test('does not throw when ref.current is null', () => {
		const ref = { current: null as HTMLDivElement | null };

		expect(() => {
			renderHook(
				() => useItemEventHandlers(rootElement, ref, onInputChange, onClick, 'test-key'),
			);
			act(() => {});
		}).not.toThrow();
	});

	test('cleanup removes listeners', () => {
		const input = document.createElement('input');
		input.type = 'checkbox';
		itemElement.appendChild(input);

		const { unmount } = renderHook(
			() => useItemEventHandlers(rootElement, itemElement, onInputChange, onClick, 'test-key'),
		);
		act(() => {});

		input.dispatchEvent(new Event('change', { bubbles: true }));
		expect(onInputChange).toHaveBeenCalledTimes(1);

		unmount();
		input.dispatchEvent(new Event('change', { bubbles: true }));
		expect(onInputChange).toHaveBeenCalledTimes(1);
	});
});
