/**
 * @jest-environment jsdom
 */

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
