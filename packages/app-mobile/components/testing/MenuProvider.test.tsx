// Tests that react-native-popup-menu works correctly with the
// closeButtonLabel prop and does not produce SafeAreaView deprecation warnings.

import * as React from 'react';
import { render } from '@testing-library/react-native';
import { MenuProvider, Menu, MenuTrigger, MenuOptions, MenuOption } from 'react-native-popup-menu';
import { Text } from 'react-native';

describe('MenuProvider', () => {
	it('should render without SafeAreaView deprecation warnings', () => {
		const warnMock = jest.spyOn(console, 'warn').mockImplementation(() => {});

		render(
			<MenuProvider closeButtonLabel='Dismiss'>
				<Menu>
					<MenuTrigger>
						<Text>Open Menu</Text>
					</MenuTrigger>
					<MenuOptions>
						<MenuOption>
							<Text>Option 1</Text>
						</MenuOption>
					</MenuOptions>
				</Menu>
			</MenuProvider>,
		);

		const safeAreaWarnings = warnMock.mock.calls.filter(
			args => args[0] && args[0].includes('SafeAreaView has been deprecated'),
		);

		expect(safeAreaWarnings).toHaveLength(0);
		warnMock.mockRestore();
	});

	it('should accept closeButtonLabel prop without TypeScript errors', () => {
		const { getByText } = render(
			<MenuProvider closeButtonLabel='Close menu'>
				<Text>Content</Text>
			</MenuProvider>,
		);

		expect(getByText('Content')).toBeTruthy();
	});
});
