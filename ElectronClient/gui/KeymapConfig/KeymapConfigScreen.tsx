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
	const [keymap, setCommandAccelerator, errorMessage] = useKeymap(keymapService);
	const [editing, setEditing] = useState<CommandEditing>(() =>
		keymapService.getCommandNames().reduce((accumulator: CommandEditing, command: string) => {
			accumulator[command] = false;
			return accumulator;
		}, {})
	);

	const handleSave = (commandName: string, accelerator: string) => {
		setCommandAccelerator(commandName, accelerator);
		setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	};

	const hanldeReset = (commandName: string) => {
		setCommandAccelerator(commandName, keymapService.getDefaultAccelerator(commandName));
		setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	};

	const handleCancel = (commandName: string) => {
		setEditing(prevEditing => ({ ...prevEditing, [commandName]: false }));
	};

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

	const renderErrorMessage = () => {
		errorMessage.length &&
			<div style={styles.warning}>
				<p style={styles.text}>
					<span>{errorMessage}</span>
				</p>
			</div>;
	};

	return (
		<div>
			{renderErrorMessage()}
			<div style={styles.container}>
				<div style={styles.topActions}>
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

