import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import * as React from 'react';
import NoteListUtils from './utils/NoteListUtils';
import { Dispatch } from 'redux';
import { ThemeStyle } from '@joplin/lib/theme';

import { buildStyle } from '@joplin/lib/theme';
import bridge from '../services/bridge';

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
			divider: {
				borderTopWidth: 1,
				borderTopStyle: 'solid',
				borderTopColor: theme.dividerColor,
				width: '100%',
				height: 1,
				marginBottom: 10,
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
			item.submenu.popup({ window: bridge().activeWindow() });
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

		if (item.type === 'separator') {
			itemComps.push(
				<div key={`divider${i}`} style={styles.divider}/>,
			);
		} else {
			itemComps.push(
				<button key={item.label} style={styles.button} onClick={() => multiNotesButton_click(item)}>
					{item.label}
				</button>,
			);
		}
	}

	return (
		<div style={styles.root}>
			<div style={styles.itemList}>{itemComps}</div>
		</div>
	);
}
