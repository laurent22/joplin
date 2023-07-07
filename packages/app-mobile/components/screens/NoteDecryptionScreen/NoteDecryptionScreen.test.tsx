/**
 * @jest-environment jsdom
 */

import * as React from 'react';

import shim from '@joplin/lib/shim';
shim.setReact(React);

import { _ } from '@joplin/lib/locale';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Note from '@joplin/lib/models/Note';
import setUpTwoClientEncryptionAndSync from '@joplin/lib/testing/setUpTwoClientEncryptionAndSync';
// import DecryptionWorker, { DecryptionWorkerState } from '@joplin/lib/services/DecryptionWorker';
// import { switchClient, synchronizerStart } from '@joplin/lib/testing/test-utils';
import { NoteDecryptionScreenComponent } from './NoteDecryptionScreen';


import { expect, describe, beforeEach, test, jest } from '@jest/globals';
import '@testing-library/jest-native/extend-expect';
import { View } from 'react-native';
import Setting from '@joplin/lib/models/Setting';
import DecryptionWorker from '@joplin/lib/services/DecryptionWorker';
import { switchClient, synchronizerStart } from '@joplin/lib/testing/test-utils';
import { ModelType } from '@joplin/lib/BaseModel';

// TODO: Redux suggests against mocking this and, instead, suggests rendering a full Provider.
// This will likely require a large number of changes, however.
// https://redux.js.org/usage/writing-tests
jest.mock('react-redux', () => {
	return {
		connect: () => (component: any) => component,
	};
});

// ScreenHeader is also a connected component, so (unless we render a Provider),
// it must be mocked.
jest.mock('../../ScreenHeader', () => {
	return {
		default: () => {
			return <View/>;
		},
	};
});

const isItemDisabled = async (id: string) => {
	const decryptionWorker = DecryptionWorker.instance();
	const disabledItemIds = (await decryptionWorker.decryptionDisabledItems()).map(item => item.id);
	return disabledItemIds.includes(id);
};

describe('NoteDecryptionScreen', () => {
	beforeEach(async () => {
		await setUpTwoClientEncryptionAndSync();
	});

	test('should navigate to view screen for undecrypted note', async () => {
		const testNote = await Note.save({ title: 'Test' });
		const dispatchMock = jest.fn();

		const view = render(<NoteDecryptionScreenComponent
			themeId={Setting.THEME_LIGHT}
			noteId={testNote.id!}
			dispatch={dispatchMock as any}
			decryptionWorkerState='idle'
		/>);

		// Wait for the "Loading..." text to disappear
		await waitFor(() =>
			expect(view.queryByText(_('Loading...'))).toBeNull()
		);

		expect(dispatchMock).toBeCalledWith({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: testNote.id,
		});
	});

	test('clicking "retry decryption" should retry decryption', async () => {
		await switchClient(1);
		const testNote = await Note.save({ title: 'Another test', body: 'This is a test' });

		// Synchronize the encrypted note
		await synchronizerStart();
		await switchClient(2);
		await synchronizerStart();

		// Disable decryption for the note
		// Encrypt the test note
		const decryptionWorker = DecryptionWorker.instance();
		await decryptionWorker.disableItem(ModelType.Note, testNote.id!);
		expect(await isItemDisabled(testNote.id!)).toBe(true);

		const dispatchMock = jest.fn<any>();
		const view = render(<NoteDecryptionScreenComponent
			themeId={Setting.THEME_DARK}
			noteId={testNote.id!}
			dispatch={dispatchMock}
			decryptionWorkerState='idle'
		/>);

		// Wait for the "retry decryption" button to appear
		const retryButton = await waitFor(() => view.getByText(_('Retry Decryption')));

		expect(dispatchMock).not.toHaveBeenCalled();
		await act(() => fireEvent.press(retryButton));

		// Firing the press event should have cleared the item from the disabled items list
		await waitFor(async () => expect(await isItemDisabled(testNote.id!)).toBe(false));

		act(() => view.unmount());
	});
});
