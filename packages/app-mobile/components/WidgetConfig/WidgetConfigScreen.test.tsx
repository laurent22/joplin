jest.mock('react-native', () => {
	const ReactNative = jest.requireActual('react-native') as typeof import('react-native');
	ReactNative.NativeModules.JoplinWidget = {
		getConfigInfo: jest.fn(),
		saveConfig: jest.fn(),
		cancelConfig: jest.fn(),
	};
	return ReactNative;
});

import * as React from 'react';
import { NativeModules } from 'react-native';

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '../../utils/testing/testingLibrary';

import WidgetConfigScreen from './WidgetConfigScreen';

interface JoplinWidgetModule {
	getConfigInfo: ()=> Promise<{ appWidgetId: number; items: { type: string; title: string }[] | null }>;
	saveConfig: (appWidgetId: number, items: { type: string; title: string }[])=> Promise<null>;
	cancelConfig: ()=> Promise<null>;
}

const joplinWidgetMock = NativeModules.JoplinWidget as jest.Mocked<JoplinWidgetModule>;

const renderScreen = () => render(<WidgetConfigScreen />);

const selectActions = async (types: string[]) => {
	for (const type of types) {
		fireEvent.press(await screen.findByTestId(`available-${type}`));
	}
};

describe('WidgetConfigScreen', () => {
	beforeEach(() => {
		joplinWidgetMock.getConfigInfo.mockReset();
		joplinWidgetMock.saveConfig.mockReset();
		joplinWidgetMock.cancelConfig.mockReset();
		joplinWidgetMock.getConfigInfo.mockResolvedValue({ appWidgetId: 5, items: null });
		joplinWidgetMock.saveConfig.mockResolvedValue(null);
		joplinWidgetMock.cancelConfig.mockResolvedValue(null);
	});

	it('builds the selection in tap order and saves it', async () => {
		renderScreen();
		await selectActions(['newPhoto', 'newNote']);

		expect(await screen.findByTestId('selected-newPhoto')).toBeTruthy();
		expect(screen.getByTestId('selected-newNote')).toBeTruthy();

		fireEvent.press(screen.getByTestId('save-button'));

		await waitFor(() => {
			expect(joplinWidgetMock.saveConfig).toHaveBeenCalledWith(5, [
				{ type: 'newPhoto', title: 'New photo' },
				{ type: 'newNote', title: 'New note' },
			]);
		});
	});

	it('removes an action from the middle and keeps the remaining order', async () => {
		renderScreen();
		await selectActions(['newNote', 'newPhoto', 'newTodo']);

		fireEvent.press(screen.getByTestId('selected-newPhoto'));
		fireEvent.press(screen.getByTestId('save-button'));

		await waitFor(() => {
			expect(joplinWidgetMock.saveConfig).toHaveBeenCalledWith(5, [
				{ type: 'newNote', title: 'New note' },
				{ type: 'newTodo', title: 'New to-do' },
			]);
		});
	});

	it('disables save when nothing is selected', async () => {
		renderScreen();
		const saveButton = await screen.findByTestId('save-button');
		expect(saveButton).toBeDisabled();
	});

	it('prefills from the saved config on reconfigure', async () => {
		joplinWidgetMock.getConfigInfo.mockResolvedValue({
			appWidgetId: 7,
			items: [
				{ type: 'newTodo', title: 'New to-do' },
				{ type: 'newDrawing', title: 'New drawing' },
			],
		});
		renderScreen();

		expect(await screen.findByTestId('selected-newTodo')).toBeTruthy();
		expect(screen.getByTestId('selected-newDrawing')).toBeTruthy();
		expect(screen.queryByTestId('selected-newNote')).toBeNull();
	});

	it('cancels via cancelConfig', async () => {
		renderScreen();
		fireEvent.press(await screen.findByTestId('cancel-button'));

		await waitFor(() => {
			expect(joplinWidgetMock.cancelConfig).toHaveBeenCalled();
		});
		expect(joplinWidgetMock.saveConfig).not.toHaveBeenCalled();
	});
});
