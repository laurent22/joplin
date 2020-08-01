import * as React from 'react';
import CommandService from '../../../../lib/services/CommandService';

const ToolbarBase = require('../../../Toolbar.min.js');
const { buildStyle, themeStyle } = require('lib/theme');

interface ToolbarProps {
	theme: number,
	dispatch: Function,
	disabled: boolean,
}

function styles_(props:ToolbarProps) {
	return buildStyle('CodeMirrorToolbar', props.theme, (/* theme:any*/) => {
		const theme = themeStyle(props.theme);
		return {
			root: {
				flex: 1,
				marginBottom: 0,
				borderTop: `1px solid ${theme.dividerColor}`,
			},
		};
	});
}

export default function Toolbar(props:ToolbarProps) {
	const styles = styles_(props);

	const cmdService = CommandService.instance();

	const toolbarItems = [
		cmdService.commandToToolbarButton('textBold'),
		cmdService.commandToToolbarButton('textItalic'),
		{ type: 'separator' },
		cmdService.commandToToolbarButton('textLink'),
		cmdService.commandToToolbarButton('textCode'),
		cmdService.commandToToolbarButton('attachFile'),
		{ type: 'separator' },
		cmdService.commandToToolbarButton('textNumberedList'),
		cmdService.commandToToolbarButton('textBulletedList'),
		cmdService.commandToToolbarButton('textCheckbox'),
		cmdService.commandToToolbarButton('textHeading'),
		cmdService.commandToToolbarButton('textHorizontalRule'),
		cmdService.commandToToolbarButton('insertDateTime'),
	];

	return <ToolbarBase disabled={props.disabled} style={styles.root} items={toolbarItems} />;
}
