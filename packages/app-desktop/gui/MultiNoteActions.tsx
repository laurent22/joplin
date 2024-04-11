import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import * as React from 'react';
import NoteListUtils from './utils/NoteListUtils';
import { Dispatch } from 'redux';
import { ThemeStyle } from '@joplin/lib/theme';

import { buildStyle } from '@joplin/lib/theme';
const bridge = require('@electron/remote').require('./bridge').default;

interface MultiNoteActionsProps {
	themeId: number;
	selectedNoteIds: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	notes: any[];
	dispatch: Dispatch;
	watchedNoteFiles: string[];
	plugins: PluginStates;
	inConflictFolder: boolean;
	customCss: string;
}

function styles_(props: MultiNoteActionsProps) {
	return buildStyle('MultiNoteActions', props.themeId, (theme: ThemeStyle) => {
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

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	const multiNotesButton_click = (item: any) => {
		if (item.submenu) {
			item.submenu.popup({ window: bridge().window() });
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
			</button>,
		);
	}

	return (
		<div style={styles.root}>
			<div style={styles.itemList}>{itemComps}</div>
		</div>
	);
}
