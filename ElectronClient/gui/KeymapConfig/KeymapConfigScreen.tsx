import * as React from 'react';
import { useState } from 'react';

import KeymapService, { KeymapItem } from '../../lib/services/KeymapService';
import { ShortcutRecorder } from './ShortcutRecorder';
import getLabel from './utils/getLabel';
import useKeymap from './utils/useKeymap';
import styles_ from './styles';

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
	const [keymap, setAccelerator, error] = useKeymap();
	const [editing, setEditing] = useState<CommandEditing>(() =>
		keymapService.getCommandNames().reduce((accumulator: CommandEditing, command: string) => {
			accumulator[command] = false;
			return accumulator;
		}, {})
	);

	const handleSave = (event: { commandName: string, accelerator: string }) => {
		const { commandName, accelerator } = event;
		setAccelerator(commandName, accelerator);
		setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	};

	const hanldeReset = (event: { commandName: string }) => {
		const { commandName } = event;
		setAccelerator(commandName, keymapService.getDefaultAccelerator(commandName));
		setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	};

	const handleCancel = (event: { commandName: string }) => {
		const { commandName } = event;
		setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	};

	const renderAccelerator = (accelerator: string) => {
		return (
			<div>
				{accelerator.split('+').map(part => <kbd style={styles.kbd} key={part}>{part}</kbd>).reduce(
					(accumulator, part) => (accumulator.length ? [...accumulator, ' + ', part] : [part]),
					[]
				)}
			</div>
		);
	};

	const renderStatus = (command: string) => {
		if (!error) return null;
		const { invalidAccelerator, invalidKeymapItem, duplicateAccelerators, duplicateKeymapItems } = error.details;

		if ((invalidAccelerator && invalidKeymapItem.command === command) ||
			(duplicateAccelerators && (duplicateKeymapItems[0].command === command || duplicateKeymapItems[1].command === command))) {
			return '❌';
		} else {
			return null;
		}
	};

	const renderKeymapRow = ({ command, accelerator }: KeymapItem) => {
		const handleClick = () => setEditing(prevEditing => ({ ...prevEditing, [command]: true }));
		const cellContent = editing[command]
			? <ShortcutRecorder
				onSave={handleSave}
				onReset={hanldeReset}
				onCancel={handleCancel}
				initialAccelerator={accelerator}
				commandName={command}
				themeId={themeId}
			/>
			: <div onClick={handleClick} style={styles.tableCell}>
				<div style={styles.tableCellShortcut}>
					{accelerator
						? renderAccelerator(accelerator)
						: <div style={styles.disabled}>{_('Disabled')}</div>
					}
				</div>
				<div style={styles.tableCellStatus}>
					{renderStatus(command)}
				</div>
			</div>;

		return (
			<tr key={command}>
				<td style={styles.tableCommandColumn}>
					{getLabel(command)}
				</td>
				<td style={styles.tableShortcutColumn}>
					{cellContent}
				</td>
			</tr>
		);
	};

	return (
		<div>
			{error &&
				<div style={styles.warning}>
					<p style={styles.text}>
						<span>
							{error.details.duplicateAccelerators
								? _('Keymap configuration contains duplicates. Change or disable one of the shortcuts to continue.')
								: error.details.invalidAccelerator
									? _('Keymap configuration contains an invalid shortcut. Change or disable it to continue.')
									: error.message // Highly unlikely that any other error will occur at this point
							}
						</span>
					</p>
				</div>
			}
			<div style={styles.container}>
				<div style={styles.actionsContainer}>
					<input
						value={filter}
						onChange={event => setFilter(event.target.value)}
						placeholder={_('Search...')}
						style={styles.filterInput}
						aria-label="Search"
					/>
				</div>
				<table style={styles.table}>
					<thead>
						<tr>
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

