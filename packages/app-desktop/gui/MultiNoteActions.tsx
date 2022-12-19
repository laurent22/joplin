import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import * as React from 'react';
import NoteListUtils from './utils/NoteListUtils';

const { buildStyle } = require('@joplin/lib/theme');
const bridge = require('@electron/remote').require('./bridge').default;

interface MultiNoteActionsProps {
	themeId: number;
	selectedNoteIds: string[];
	notes: any[];
	dispatch: Function;
	watchedNoteFiles: string[];
	plugins: PluginStates;
	inConflictFolder: boolean;
	customCss: string;
}

function styles_(props: MultiNoteActionsProps) {
	return buildStyle('MultiNoteActions', props.themeId, (theme: any) => {
		return {
			root: {
				display: 'inline-flex',
				justifyContent: 'center',
				paddingTop: theme.marginTop,
				width: '100%',
			},
			itemList: {
				display: 'flex',
				flexDirection: 'column',
			},
			button: {
				...theme.buttonStyle,
				marginBottom: 10,
			},
		};
	});
}

export default function MultiNoteActions(props: MultiNoteActionsProps) {
	const styles = styles_(props);

	const multiNotesButton_click = (item: any) => {
		if (item.submenu) {
			item.submenu.popup(bridge().window());
		} else {
			item.click();
		}
	};

	const menu = NoteListUtils.makeContextMenu(props.selectedNoteIds, {
		notes: props.notes,
		dispatch: props.dispatch,
		watchedNoteFiles: props.watchedNoteFiles,
		plugins: props.plugins,
		inConflictFolder: props.inConflictFolder,
		customCss: props.customCss,
	});

	const itemComps = [];
	const menuItems = menu.items;

	for (let i = 0; i < menuItems.length; i++) {
		const item = menuItems[i];
		if (!item.enabled) continue;

		itemComps.push(
			<button key={item.label} style={styles.button} onClick={() => multiNotesButton_click(item)}>
				{item.label}
			</button>
		);
	}

	return (
		<div style={styles.root}>
			<div style={styles.itemList}>{itemComps}</div>
		</div>
	);
}
