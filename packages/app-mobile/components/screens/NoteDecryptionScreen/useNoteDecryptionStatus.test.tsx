/**
 * @jest-environment jsdom
 */

import * as React from 'react';

import shim from '@joplin/lib/shim';
shim.setReact(React);

import { act, renderHook, waitFor } from '@testing-library/react-native';
import Note from '@joplin/lib/models/Note';
import useNoteDecryptionStatus from './useNoteDecryptionStatus';
import { NoteEntity } from '@joplin/lib/services/database/types';
import setUpTwoClientEncryptionAndSync from '@joplin/lib/testing/setUpTwoClientEncryptionAndSync';
import DecryptionWorker, { DecryptionWorkerState } from '@joplin/lib/services/DecryptionWorker';
import { switchClient, synchronizerStart } from '@joplin/lib/testing/test-utils';

import { expect, describe, beforeEach, test } from '@jest/globals';


type ResultType = ReturnType<typeof useNoteDecryptionStatus>;
type ResultRefType = { current: ResultType };
type PropsType = { note: NoteEntity|null; decryptionWorkerState: DecryptionWorkerState };

// Waits for async operations in the decryption status hook to finish.
const waitForHookToLoad = async (hookResult: ResultRefType) => {
	// Wait for the decrypted item list to load
	// Note that this prevents warnings. See https://callstack.github.io/react-native-testing-library/docs/understanding-act#solution-with-real-timers
	await waitFor(() => expect(hookResult.current.decryptionDisabled).not.toBeNull());
};

const wrapHook = async (
	initialNote: NoteEntity|null, initialDecryptionWorkerState: DecryptionWorkerState
) => {
	const { result, rerender } = renderHook<ResultType, PropsType>(
		({ note, decryptionWorkerState }) =>
			useNoteDecryptionStatus(note, decryptionWorkerState),
		{
			initialProps: {
				note: initialNote,
				decryptionWorkerState: initialDecryptionWorkerState,
			},
		}
	);

	if (initialNote !== null) {
		await waitForHookToLoad(result);
	}

	return {
		result,
		rerender: (note: NoteEntity|null, decryptionWorkerState: DecryptionWorkerState) => {
			rerender({ note, decryptionWorkerState });
		},
	};
};

describe('useNoteDecryptionStatus', () => {
	beforeEach(async () => {
		await setUpTwoClientEncryptionAndSync();
	});

	test('should report encrytped as false when note is unencrypted', async () => {
		const id = (await Note.save({ title: 'Test' })).id as string;
		const note = await Note.load(id);

		const { result, rerender } = await wrapHook(note, 'idle');

		expect(result.current).toMatchObject({
			decrypting: false,
			decrypted: true,
			errorMessage: null,
		});

		// Even if the worker's state is changed to 'started', it should still
		// be marked as decrypted
		rerender(note, 'started');
		expect(result.current).toMatchObject({
			decrypting: false,
			decrypted: true,
			errorMessage: null,
		});
	});

	test('should report decrypting as true while attempting to decrypt a note', async () => {
		await switchClient(2);
		// Start with no note
		const { result, rerender } = await wrapHook(null, 'idle');
		expect(result.current).toMatchObject({
			decrypting: false,
			decrypted: false,
			errorMessage: null,
		});

		await switchClient(1);
		const testNoteId = (await Note.save({ title: 'Test note' })).id as string;

		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();

		// Overwrite with a note that can't be decrypted
		await Note.save(
			{ id: testNoteId, encryption_cipher_text: 'won\'t decrypt' }
		);
		const undecryptableNote = await Note.load(testNoteId);

		// Rerender, supposing that undecryptableNote isn't disabled and is being decrypted
		rerender(undecryptableNote, 'started');

		// The note was changed, so we need to wait for note-related data to load.
		await waitForHookToLoad(result);

		expect(result.current).toMatchObject({
			decrypted: false,
			decrypting: true,
			errorMessage: null,
		});

		const decryptionWorker = DecryptionWorker.instance();
		await act(() => decryptionWorker.start());

		expect(decryptionWorker.getState()).toBe('idle');
		rerender(undecryptableNote, 'idle');

		expect(result.current).toMatchObject({
			decrypted: false,
			decrypting: false,
		});
		expect(result.current.errorMessage).not.toBeNull();
	});
});
