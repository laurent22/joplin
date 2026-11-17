import * as React from 'react';
import { Text } from 'react-native';
import NoteOpenTransition from './NoteOpenTransition';
import { render, screen } from '../utils/testing/testingLibrary';
import { clearNoteOpenTransition, consumeNoteOpenTransition, requestNoteOpenTransition } from '../utils/noteOpenTransition';

describe('NoteOpenTransition', () => {
	beforeEach(() => {
		clearNoteOpenTransition();
	});

	test('should render its children when there is no pending transition', () => {
		render(<NoteOpenTransition><Text>Note screen</Text></NoteOpenTransition>);
		expect(screen.getByText('Note screen')).toBeVisible();
	});

	test('should consume the pending transition and render its children', () => {
		requestNoteOpenTransition({ x: 100, y: 200 });
		render(<NoteOpenTransition><Text>Note screen</Text></NoteOpenTransition>);
		expect(screen.getByText('Note screen')).toBeTruthy();
		expect(consumeNoteOpenTransition()).toBe(null);
	});
});
