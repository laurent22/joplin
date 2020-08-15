import * as React from 'react';
import { useState, useEffect } from 'react';

import styles_ from './styles';
import { ShortcutRecorder } from './ShortcutRecorder';
import CommandService from '../../lib/services/CommandService';
import KeymapService, { KeymapItem } from '../../lib/services/KeymapService';

const { _ } = require('lib/locale.js');
const { shim } = require('lib/shim.js');

const keymapService = KeymapService.instance();
const commandService = CommandService.instance();

interface CommandLabels {
	[commandName: string]: string
}

// Some commands aren't actually registered in CommandService
// These hardcoded labels are used for those commands instead
const commandLabels: CommandLabels = {
	quit: _('Quit'),
	insertTemplate: _('Insert template'),
	zoomActualSize: _('Actual Size'),
	// Conditionally set the label because it's different in macOS and other platforms
	config: _(shim.isMac() ? 'Preferences' : 'Options'),
	gotoAnything: _('Goto Anything...'),
	help: _('Website and documentation'),
	hideApp: _('Hide Joplin'),
	closeWindow: _('Close Window'),
};
// Obtain the rest of the labels
keymapService.getCommands().forEach((commandName: string) => {
	commandLabels[commandName] = commandLabels[commandName] || commandService.label(commandName);
});

interface CommandEditing {
	[commandName: string]: boolean
}

export interface KeymapConfigScreenProps {
	theme: number
}

export const KeymapConfigScreen = ({ theme }: KeymapConfigScreenProps) => {
	const styles = styles_(theme);

	const [filter, setFilter] = useState('');
	const [errorMessage, setErrorMessage] = useState('');
	const [keymap, setKeymap] = useState<KeymapItem[]>(() => keymapService.getKeymap());
	const [editing, setEditing] = useState<CommandEditing>(() =>
		keymapService.getCommands().reduce((accumulator: CommandEditing, command: string) => {
			accumulator[command] = false;
			return accumulator;
		}, {})
	);

	const setCommandAccelerator = (commandName: string, accelerator: string) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];

			newKeymap.find(item => item.command === commandName).accelerator = accelerator;
			return newKeymap;
		});
	};

	const resetCommandAccelerator = (commandName: string) => {
		setKeymap(prevKeymap => {
			const newKeymap = [...prevKeymap];
			const defaultAccelerator = keymapService.getDefaultAccelerator(commandName);

			newKeymap.find(item => item.command === commandName).accelerator = defaultAccelerator;
			return newKeymap;
		});
	};

	const toggleEditing = (commandName: string) => {
		setEditing(prevEditing => {
			const newEditing = { ...prevEditing };

			newEditing[commandName] = !newEditing[commandName];
			return newEditing;
		});
	};

	useEffect(() => {
		try {
			// Synchronize the keymap of KeymapService with the current keymap state
			keymapService.setKeymap(keymap);
			keymapService.saveKeymap(); // Save changes to the disk

			// TODO: Use events instead?
			keymapService.triggerMenuRefresh();

			setErrorMessage('');
		} catch (err) {
			const message = err.message || '';
			setErrorMessage(message);
		}
	}, [keymap]);

	const renderKeymapRow = ({ command, accelerator }: KeymapItem) => {
		const handleClick = () => toggleEditing(command);
		const cellContent = editing[command]
			? <ShortcutRecorder
				setAccelerator={(accelerator: string) => setCommandAccelerator(command, accelerator)}
				resetAccelerator={() => resetCommandAccelerator(command)}
				toggleEditing={() => toggleEditing(command)}
				theme={theme}
			/>
			: <div onClick={handleClick}>
				{accelerator || _('Disabled')}
			</div>;

		return (
			<tr key={command} style={styles.tableRow}>
				<td style={styles.tableCommandColumn}>{commandLabels[command]}</td>
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
		<>
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
							return (command.toLowerCase().includes(filterLowerCase) || commandLabels[command].toLowerCase().includes(filterLowerCase));
						}).map(item => renderKeymapRow(item))}
					</tbody>
				</table>
			</div>
		</>
	);
};

