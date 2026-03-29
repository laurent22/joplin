import * as React from 'react';
import { renderToString } from 'react-dom/server';
import Button, { ButtonLevel } from './Button';

const { ServerStyleSheet, ThemeProvider } = require('styled-components');

const theme = {
	toolbarIconSize: 16,
	backgroundColor3: '#111111',
	backgroundColor4: '#222222',
	backgroundColor5: '#333333',
	backgroundColorHover4: '#444444',
	backgroundColorHover5: '#555555',
	backgroundColorHoverDim3: '#666666',
	backgroundColorActive3: '#777777',
	backgroundColorActive4: '#888888',
	backgroundColorActive5: '#999999',
	borderColor4: '#aaaaaa',
	color: '#bbbbbb',
	color2: '#cccccc',
	color3: '#dddddd',
	color4: '#eeeeee',
	color5: '#ffffff',
	colorHover2: '#121212',
	colorActive2: '#232323',
};

describe('Button styles', () => {
	it('limits hover and active states to enabled buttons', () => {
		const sheet = new ServerStyleSheet();

		renderToString(sheet.collectStyles(
			<ThemeProvider theme={theme}>
				<div>
					<Button level={ButtonLevel.Primary} title='Primary' />
					<Button level={ButtonLevel.Secondary} title='Secondary' />
					<Button level={ButtonLevel.Tertiary} title='Tertiary' />
					<Button level={ButtonLevel.SidebarSecondary} title='Sidebar secondary' />
				</div>
			</ThemeProvider>,
		));

		const styles = sheet.getStyleTags();
		const enabledHoverMatches = styles.match(/:enabled:hover/g) ?? [];
		const enabledActiveMatches = styles.match(/:enabled:active/g) ?? [];

		expect(enabledHoverMatches).toHaveLength(4);
		expect(enabledActiveMatches).toHaveLength(4);
		expect(styles).not.toContain('true{');
		expect(styles).not.toContain('false{');
	});
});
