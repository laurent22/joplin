/**
 * @jest-environment jsdom
 */

import { writeFileSync } from 'fs-extra';
import { join } from 'path';
import Setting from '@joplin/lib/models/Setting';

// Mock react-native-vector-icons -- it uses ESM imports, which, by default, are not
// supported by jest.
jest.doMock('react-native-vector-icons/Ionicons', () => {
	return {
		default: {
			getImageSourceSync: () => {
				// Create an empty file that can be read/used as an image resource.
				const iconPath = join(Setting.value('cacheDir'), 'test-icon.png');
				writeFileSync(iconPath, '', 'utf-8');

				return { uri: iconPath };
			},
		},
	};
});

import lightTheme from '@joplin/lib/themes/light';
import { editPopupClass, getEditPopupSource } from './useEditPopup';
import { describe, it, expect, beforeAll, jest } from '@jest/globals';
import { setupDatabaseAndSynchronizer, switchClient } from '@joplin/lib/testing/test-utils';

const createEditPopup = (target: HTMLElement) => {
	const { createEditPopupSyntax } = getEditPopupSource(lightTheme);
	eval(`(${createEditPopupSyntax})`)(target, 'someresourceid', '() => {}');
};

const destroyEditPopup = () => {
	const { destroyEditPopupSyntax } = getEditPopupSource(lightTheme);
	eval(`(${destroyEditPopupSyntax})`)();
};

describe('useEditPopup', () => {
	beforeAll(async () => {
		// useEditPopup relies on the resourceDir setting, which is set by
		// switchClient.
		await setupDatabaseAndSynchronizer(0);
		await switchClient(0);
	});

	it('should attach an edit popup to an image', () => {
		const container = document.createElement('div');
		const targetImage = document.createElement('img');
		container.appendChild(targetImage);

		createEditPopup(targetImage);

		// Popup should be present in the document
		expect(container.querySelector(`.${editPopupClass}`)).not.toBeNull();

		// Destroy the edit popup
		jest.useFakeTimers();
		destroyEditPopup();

		// Give time for the popup's fade out animation to run.
		jest.advanceTimersByTime(1000 * 10);

		// Popup should be destroyed.
		expect(container.querySelector(`.${editPopupClass}`)).toBeNull();

		targetImage.remove();
	});

	it('should auto-remove the edit popup after a delay', () => {
		jest.useFakeTimers();

		const container = document.createElement('div');
		const targetImage = document.createElement('img');
		container.appendChild(targetImage);

		jest.useFakeTimers();
		createEditPopup(targetImage);


		expect(container.querySelector(`.${editPopupClass}`)).not.toBeNull();
		jest.advanceTimersByTime(1000 * 20); // ms
		expect(container.querySelector(`.${editPopupClass}`)).toBeNull();
	});
});
