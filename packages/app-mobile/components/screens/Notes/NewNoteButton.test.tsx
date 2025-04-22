import * as React from 'react';
import TestProviderStack from '../../testing/TestProviderStack';
import NewNoteButton from './NewNoteButton';
import { AppState } from '../../../utils/types';
import { Store } from 'redux';
import createMockReduxStore from '../../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../../utils/testing/setupGlobalStore';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';
import { AccessibilityActionInfo } from 'react-native';
import { setupDatabaseAndSynchronizer } from '@joplin/lib/testing/test-utils';
import Folder from '@joplin/lib/models/Folder';
import NavService from '@joplin/lib/services/NavService';
import Setting from '@joplin/lib/models/Setting';
import Note from '@joplin/lib/models/Note';

let testStore: Store<AppState>;

interface WrappedNewNoteButtonProps {}

const WrappedNewNoteButton: React.FC<WrappedNewNoteButtonProps> = () => {
	return <TestProviderStack store={testStore}>
		<NewNoteButton/>
	</TestProviderStack>;
};

describe('NewNoteButton', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(0);
		testStore = createMockReduxStore();
		setupGlobalStore(testStore);

		// Set an initial folder
		const folder = await Folder.save({ title: 'Test folder' });
		Setting.setValue('activeFolderId', folder.id);
		await NavService.go('Notes', { folderId: folder.id });
	});

	test('should be possible to create a note using accessibility actions', async () => {
		const wrapper = render(<WrappedNewNoteButton/>);

		const toggleButton = screen.getByRole('button', { name: 'Add new' });
		expect(toggleButton).toBeVisible();

		const actions: AccessibilityActionInfo[] = toggleButton.props.accessibilityActions;
		const newNoteAction = actions.find(action => action.label === 'New note');
		expect(newNoteAction).toBeTruthy();

		const onAction = toggleButton.props.onAccessibilityAction;
		await act(() => {
			return onAction({ nativeEvent: { actionName: newNoteAction.name } });
		});

		await waitFor(async () => {
			expect(await Note.allIds()).toHaveLength(1);
		});

		wrapper.unmount();
	});
});
