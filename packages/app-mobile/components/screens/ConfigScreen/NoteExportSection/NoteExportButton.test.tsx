import * as React from 'react';

import { _ } from '@joplin/lib/locale';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { expect, describe, beforeEach, test, jest } from '@jest/globals';
import '@testing-library/jest-native/extend-expect';
import { createNTestNotes, setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';
import Folder from '@joplin/lib/models/Folder';
import configScreenStyles from '../configScreenStyles';
import { type ShareOptions } from 'react-native-share';
import Setting from '@joplin/lib/models/Setting';
import NoteExportButton from './NoteExportButton';

jest.mock('react-native-share', () => {
	const Share = {
		open: (_options: ShareOptions) => jest.fn(),
	};
	return { default: Share };
});

describe('NoteExportButton', () => {
	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);

		const folder1 = await Folder.save({ title: 'folder1' });
		await createNTestNotes(10, folder1);

		const folder2 = await Folder.save({ title: 'Folder 2 🙂' });
		await createNTestNotes(10, folder2);
	});

	test('should show "Exported successfully!" after clicking "Export"', async () => {
		const styles = configScreenStyles(Setting.THEME_DARK);
		const view = render(<NoteExportButton
			styles={styles}
		/>);

		const exportButton = view.getByText(_('Export all notes as JEX'));
		await act(() => fireEvent.press(exportButton));

		await waitFor(() =>
			expect(view.queryByText(_('Exported successfully!'))).not.toBeNull()
		);

		// With the default folder setup, there should be no warnings
		expect(view.queryByText(/Warnings/g)).toBeNull();
	});
});
