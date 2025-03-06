import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import '@testing-library/jest-native/extend-expect';

import { Store } from 'redux';
import { AppState } from '../../utils/types';
import TestProviderStack from '../testing/TestProviderStack';
import EditorToolbar from './EditorToolbar';
import { setupDatabase, switchClient } from '@joplin/lib/testing/test-utils';
import createMockReduxStore from '../../utils/testing/createMockReduxStore';
import setupGlobalStore from '../../utils/testing/setupGlobalStore';
import Setting from '@joplin/lib/models/Setting';
import { RegisteredRuntime } from '@joplin/lib/services/CommandService';
import mockCommandRuntimes from './testing/mockCommandRuntimes';

let store: Store<AppState>;

interface WrapperProps { }

const WrappedToolbar: React.FC<WrapperProps> = _props => {
	return <TestProviderStack store={store}>
		<EditorToolbar editorState={null} />
	</TestProviderStack>;
};

const queryToolbarButton = (label: string) => {
	return screen.queryByRole('button', { name: label });
};

const openSettings = async () => {
	const settingButton = screen.getByRole('button', { name: 'Settings' });
	fireEvent.press(settingButton);

	// Settings should be open:
	const settingsHeader = await screen.findByRole('heading', { name: 'Manage toolbar options' });
	expect(settingsHeader).toBeVisible();
};

interface ToggleSettingItemProps {
	name: string;
	expectedInitialState: boolean;
}
const toggleSettingsItem = async (props: ToggleSettingItemProps) => {
	const initialChecked = props.expectedInitialState;
	const finalChecked = !props.expectedInitialState;

	const itemCheckbox = await screen.findByRole('checkbox', { name: props.name });
	expect(itemCheckbox).toBeVisible();
	expect(itemCheckbox).toHaveAccessibilityState({ checked: initialChecked });
	fireEvent.press(itemCheckbox);

	await waitFor(() => {
		expect(itemCheckbox).toHaveAccessibilityState({ checked: finalChecked });
	});
};

let mockCommands: RegisteredRuntime|null = null;

describe('EditorToolbar', () => {
	beforeEach(async () => {
		await setupDatabase(0);
		await switchClient(0);

		store = createMockReduxStore();
		setupGlobalStore(store);
		mockCommands = mockCommandRuntimes(store);

		// Start with the default set of buttons
		Setting.setValue('editor.toolbarButtons', []);
	});

	afterEach(() => {
		mockCommands?.deregister();
		mockCommands = null;
	});

	it('unchecking items in settings should remove them from the toolbar', async () => {
		const toolbar = render(<WrappedToolbar/>);

		// The bold button should be visible by default (if this changes, switch this
		// test to a button that is present by default).
		const boldLabel = 'Bold';
		const boldButton = queryToolbarButton(boldLabel);
		expect(boldButton).toBeVisible();

		await openSettings();
		await toggleSettingsItem({ name: boldLabel, expectedInitialState: true });

		// Bold button should be removed from the toolbar
		await waitFor(() => {
			expect(queryToolbarButton(boldLabel)).toBe(null);
		});

		toolbar.unmount();
	});

	it('checking items in settings should add them to the toolbar', async () => {
		// Start with a mostly-empty toolbar for testing
		Setting.setValue('editor.toolbarButtons', ['textBold', 'textItalic']);

		const toolbar = render(<WrappedToolbar/>);

		// Initially, the button shouldn't be present in the toolbar.
		const commandLabel = 'Code';
		expect(queryToolbarButton(commandLabel)).toBeNull();

		await openSettings();
		await toggleSettingsItem({ name: commandLabel, expectedInitialState: false });

		// The button should now be added to the toolbar
		await waitFor(() => {
			expect(queryToolbarButton(commandLabel)).toBeVisible();
		});

		toolbar.unmount();
	});

	it('should only include the math toolbar button if math is enabled in global settings', async () => {
		Setting.setValue('editor.toolbarButtons', ['editor.textMath']);
		Setting.setValue('markdown.plugin.katex', true);

		const toolbar = render(<WrappedToolbar/>);

		// Should initially show in the toolbar
		expect(queryToolbarButton('Math')).toBeVisible();

		// After disabled: Should not show in the toolbar
		await waitFor(() => {
			Setting.setValue('markdown.plugin.katex', false);
			expect(queryToolbarButton('Math')).toBeNull();
		});

		// Should not show in settings
		await openSettings();
		expect(screen.queryByRole('checkbox', { name: 'Math' })).toBeNull();

		toolbar.unmount();
	});
});
