import * as React from 'react';
import { useState, useEffect } from 'react';

import styles_ from './styles';
import { ShortcutRecorder } from './ShortcutRecorder';
import KeymapService, { KeymapItem } from '../../lib/services/KeymapService';
import getLabel from './utils/getLabel';

const { _ } = require('lib/locale.js');
const keymapService = KeymapService.instance();

interface CommandEditing {
	[commandName: string]: boolean
}

export interface KeymapConfigScreenProps {
	themeId: number
}

export const KeymapConfigScreen = ({ themeId }: KeymapConfigScreenProps) => {
	const styles = styles_(themeId);

	const [filter, setFilter] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [keymap, setKeymap] = useState<KeymapItem[]>(() => keymapService.getKeymap());
	const [editing, setEditing] = useState<CommandEditing>(() =>
		keymapService.getCommands().reduce((accumulator: CommandEditing, command: string) => {
			accumulator[command] = false;
			return accumulator;
		}, {})
	);

	const handleSave = (commandName: string, accelerator: string) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];

			newKeymap.find(item => item.command === commandName).accelerator = accelerator;
			return newKeymap;
		});
		setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	};

	const hanldeReset = (commandName: string) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];
			const defaultAccelerator = keymapService.getDefaultAccelerator(commandName);

			newKeymap.find(item => item.command === commandName).accelerator = defaultAccelerator;
			return newKeymap;
		});
		setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	};

	const handleCancel = (commandName: string) => {
		setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	};

	useEffect(() => {
		try {
			// Synchronize the keymap of KeymapService with the current keymap state
			keymapService.setKeymap(keymap);
			keymapService.saveKeymap(); // Save changes to the disk

			setErrorMessage('');
		} catch (err) {
			const message = err.message || '';
			setErrorMessage(message);
		}
	}, [keymap]);

	const renderKeymapRow = ({ command, accelerator }: KeymapItem) => {
		const handleClick = () => setEditing(prevEditing => ({ ...prevEditing, [command]: true }));
		const cellContent = editing[command]
			? <ShortcutRecorder
				onSave={handleSave}
				onReset={hanldeReset}
				onCancel={handleCancel}
				commandName={command}
				themeId={themeId}
			/>
			: <div onClick={handleClick}>
				{accelerator || _('Disabled')}
			</div>;

		return (
			<tr key={command} style={styles.tableRow}>
				<td style={styles.tableCommandColumn}>
					{getLabel(command)}
				</td>
				<td style={styles.tableShortcutColumn}>
					{cellContent}
				</td>
			</tr>
		);
	};

	const renderErrorMessage = (errorMessage: string) => {
		if (errorMessage.length) {
			return (
				<div style={styles.warning}>
					<p style={styles.text}>
						<span>{errorMessage}</span>
					</p>
				</div>
			);
		} else { return null; }
	};

	return (
		<div>
			{renderErrorMessage(errorMessage)}
			<div style={styles.container}>
				<div style={styles.topActions}>
					<input
						value={filter}
						onChange={event => setFilter(event.target.value)}
						placeholder={_('Search...')}
						style={styles.filterInput}
					/>
				</div>
				<table style={styles.table}>
					<thead>
						<tr style={styles.tableRow}>
							<th style={styles.tableCommandColumn}>{_('Command')}</th>
							<th style={styles.tableShortcutColumn}>{_('Keyboard Shortcut')}</th>
						</tr>
					</thead>
					<tbody>
						{keymap.filter(({ command }) => {
							const filterLowerCase = filter.toLowerCase();
							return (command.toLowerCase().includes(filterLowerCase) || getLabel(command).toLowerCase().includes(filterLowerCase));
						}).map(item => renderKeymapRow(item))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

