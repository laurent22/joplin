import * as React from 'react';

const ToolbarBase = require('../../../Toolbar.min.js');
const { _ } = require('lib/locale');
const { buildStyle, themeStyle } = require('../../../../theme.js');

interface ToolbarProps {
	theme: number,
	dispatch: Function,
	disabled: boolean,
}

function styles_(props:ToolbarProps) {
	return buildStyle('AceEditorToolbar', props.theme, (/* theme:any*/) => {
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

	function createToolbarItems() {
		const toolbarItems = [];

		toolbarItems.push({
			tooltip: _('Bold'),
			iconName: 'fa-bold',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'textBold',
				});
			},
		});

		toolbarItems.push({
			tooltip: _('Italic'),
			iconName: 'fa-italic',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'textItalic',
				});
			},
		});

		toolbarItems.push({
			type: 'separator',
		});

		toolbarItems.push({
			tooltip: _('Hyperlink'),
			iconName: 'fa-link',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'textLink',
				});
			},
		});

		toolbarItems.push({
			tooltip: _('Code'),
			iconName: 'fa-code',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'textCode',
				});
			},
		});

		toolbarItems.push({
			tooltip: _('Attach file'),
			iconName: 'fa-paperclip',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'attachFile',
				});
			},
		});

		toolbarItems.push({
			type: 'separator',
		});

		toolbarItems.push({
			tooltip: _('Numbered List'),
			iconName: 'fa-list-ol',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'textNumberedList',
				});
			},
		});

		toolbarItems.push({
			tooltip: _('Bulleted List'),
			iconName: 'fa-list-ul',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'textBulletedList',
				});
			},
		});

		toolbarItems.push({
			tooltip: _('Checkbox'),
			iconName: 'fa-check-square',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'textCheckbox',
				});
			},
		});

		toolbarItems.push({
			tooltip: _('Heading'),
			iconName: 'fa-heading',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'textHeading',
				});
			},
		});

		toolbarItems.push({
			tooltip: _('Horizontal Rule'),
			iconName: 'fa-ellipsis-h',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'textHorizontalRule',
				});
			},
		});

		toolbarItems.push({
			tooltip: _('Insert Date Time'),
			iconName: 'fa-calendar-plus',
			onClick: () => {
				props.dispatch({
					type: 'WINDOW_COMMAND',
					name: 'insertDateTime',
				});
			},
		});

		toolbarItems.push({
			type: 'separator',
		});

		return toolbarItems;
	}

	return <ToolbarBase disabled={props.disabled} style={styles.root} items={createToolbarItems()} />;
}
