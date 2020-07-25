import * as React from 'react';
import { useState } from 'react';

import styles_ from './styles';
import { ShortcutRecorder } from './ShortcutRecorder';
const CommandService = require('lib/services/CommandService').default;
const { _ } = require('lib/locale.js');

export interface KeymapConfigScreenProps {
	theme: number
}

interface KeymapItem {
	label: string,
	accelerator: string,
	command: string,
	isEditing: boolean,
}

export const KeymapConfigScreen = (props: KeymapConfigScreenProps) => {
	const styles = styles_(props);

	const [filter, setFilter] = useState('');
	const [keymap, setKeymap] = useState<KeymapItem[]>(
		() => KeymapService_instance_getCommands().map(commandName => {
			return {
				label: CommandService.instance().label(commandName),
				accelerator: KeymapService_instance_getAccelerator(commandName),
				command: commandName,
				isEditing: false,
			};
		})
	);

	const setAccelerator = (commandName: string, accelerator: string) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];

			newKeymap.find(item => item.command === commandName).accelerator = accelerator;
			return newKeymap;
		});
	};

	const setIsEditing = (commandName: string, isEditing: boolean) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];

			newKeymap.find(item => item.command === commandName).isEditing = isEditing;
			return newKeymap;
		});
	};

	const renderKeymapRow = (item: KeymapItem) => {
		const handleClick = () => setIsEditing(item.command, true);
		const cellContent = item.isEditing ?
			<ShortcutRecorder
				updateAccelerator={(accelerator: string) => setAccelerator(item.command, accelerator)}
				updateIsEditing={(isEditing: boolean) => setIsEditing(item.command, isEditing)}
				theme={props.theme}
			/> : <div onClick={handleClick}>
				{item.accelerator.length ? item.accelerator : _('Disabled')}
			</div>;

		return (
			<tr key={item.command}>
				<td style={styles.textStyle}>{item.label}</td>
				<td style={styles.textStyle}>
					{cellContent}
				</td>
			</tr>
		);
	};

	return (
		<div style={styles.containerStyle}>
			<div style={styles.topActionsStyle}>
				<input
					value={filter}
					onChange={event => setFilter(event.target.value)}
					placeholder={_('Search..')}
					style={styles.filterInputStyle}
				/>

				<button style={styles.inlineButtonStyle} onClick={() => console.log('Import')}>
					{_('Import')}
				</button>

				<button style={styles.inlineButtonStyle} onClick={() => console.log('Export')}>
					{_('Export')}
				</button>
			</div>

			<table style={styles.tableStyle}>
				<thead>
					<tr>
						<th style={styles.textStyle}>{_('Command')}</th>
						<th style={styles.textStyle}>{_('Keyboard Shortcut')}</th>
					</tr>
				</thead>
				<tbody>
					{keymap.map(item => renderKeymapRow(item))}
				</tbody>
			</table>
		</div>
	);
};

// Placeholder
const KeymapService_instance_getAccelerator = (commandName: string) => {
	switch (commandName) {
	case 'textCopy':
		return 'Ctrl+C';
	case 'textCut':
		return 'Ctrl+X';
	case 'textPaste':
		return 'Ctrl+V';
	default:
		throw new Error('Invalid command');
	}
};

// Placeholder
const KeymapService_instance_getCommands = () => [
	'textCopy',
	'textCut',
	'textPaste',
];
