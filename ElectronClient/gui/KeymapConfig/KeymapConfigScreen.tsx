import * as React from 'react';
import { useState } from 'react';

import { KeymapItem } from '../../lib/services/KeymapService';
import { ShortcutRecorder } from './ShortcutRecorder';
import getLabel from './utils/getLabel';
import useKeymap from './utils/useKeymap';
import useCommandStatus from './utils/useCommandStatus';
import styles_ from './styles';

const { bridge } = require('electron').remote.require('./bridge');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');

export interface KeymapConfigScreenProps {
	themeId: number
}

export const KeymapConfigScreen = ({ themeId }: KeymapConfigScreenProps) => {
	const styles = styles_(themeId);

	const [filter, setFilter] = useState('');
	const [keymapItems, keymapError, overrideKeymapItems, exportCustomKeymap, setAccelerator, resetAccelerator] = useKeymap();
	const [recorderError, setRecorderError] = useState<Error>(null);
	const [editing, enableEditing, disableEditing] = useCommandStatus();
	const [hovering, enableHovering, disableHovering] = useCommandStatus();

	const handleSave = (event: { commandName: string, accelerator: string }) => {
		const { commandName, accelerator } = event;
		setAccelerator(commandName, accelerator);
		disableEditing(commandName);
	};

	const handleReset = (event: { commandName: string }) => {
		const { commandName } = event;
		resetAccelerator(commandName);
		disableEditing(commandName);
	};

	const handleCancel = (event: { commandName: string }) => {
		const { commandName } = event;
		disableEditing(commandName);
	};

	const handleError = (event: { recorderError: Error }) => {
		const { recorderError } = event;
		setRecorderError(recorderError);
	};

	const handleImport = async () => {
		const filePath = bridge().showOpenDialog({
			properties: ['openFile'],
			defaultPath: 'keymap-desktop',
			filters: [{ name: 'Joplin Keymaps (keymap-desktop.json)', extensions: ['json'] }],
		});

		if (filePath) {
			const actualFilePath = filePath[0];
			try {
				const keymapFile = await shim.fsDriver().readFile(actualFilePath, 'utf-8');
				overrideKeymapItems(JSON.parse(keymapFile));
			} catch (err) {
				bridge().showErrorMessageBox(`${_('An unexpected error occured while importing the keymap!')}\n${err.message}`);
			}
		}
	};

	const handleExport = async () => {
		const filePath = bridge().showSaveDialog({
			defaultPath: 'keymap-desktop',
			filters: [{ name: 'Joplin Keymaps (keymap-desktop.json)', extensions: ['json'] }],
		});

		if (filePath) {
			try {
				// KeymapService is already synchronized with the in-state keymap
				await exportCustomKeymap(filePath);
			} catch (err) {
				bridge().showErrorMessageBox(`${_('An unexpected error occured while exporting the keymap!')}\n${err.message}`);
			}
		}
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

	const renderStatus = (commandName: string) => {
		if (editing[commandName]) {
			return (recorderError && <i className="fa fa-exclamation-triangle" />);
		} else if (hovering[commandName]) {
			return (<i className="fa fa-pen" />);
		} else {
			return null;
		}
	};

	const renderError = (error: Error) => {
		return (
			<div style={styles.warning}>
				<p style={styles.text}>
					<span>
						{error.message}
					</span>
				</p>
			</div>
		);
	};

	const renderKeymapRow = ({ command, accelerator }: KeymapItem) => {
		const handleClick = () => enableEditing(command);
		const handleMouseEnter = () => enableHovering(command);
		const handleMouseLeave = () => disableHovering(command);
		const cellContent =
			<div style={styles.tableCell} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
				{editing[command] ?
					<ShortcutRecorder
						onSave={handleSave}
						onReset={handleReset}
						onCancel={handleCancel}
						onError={handleError}
						initialAccelerator={accelerator || '' /* Because accelerator is null if disabled */}
						commandName={command}
						themeId={themeId}
					/> :
					<div style={styles.tableCellContent} onClick={handleClick}>
						{accelerator
							? renderAccelerator(accelerator)
							: <div style={styles.disabled}>{_('Disabled')}</div>
						}
					</div>
				}
				<div style={styles.tableCellStatus} onClick={handleClick}>
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
			{keymapError && renderError(keymapError)}
			<div style={styles.container}>
				<div style={styles.actionsContainer}>
					<label style={styles.label}>{_('Search')}</label>
					<input
						value={filter}
						onChange={event => setFilter(event.target.value)}
						placeholder={_('Search...')}
						style={styles.filterInput}
					/>
					<button style={styles.inlineButton} onClick={handleImport}>{_('Import')}</button>
					<button style={styles.inlineButton} onClick={handleExport}>{_('Export')}</button>
				</div>

				<table style={styles.table}>
					<thead>
						<tr>
							<th style={styles.tableCommandColumn}>{_('Command')}</th>
							<th style={styles.tableShortcutColumn}>{_('Keyboard Shortcut')}</th>
						</tr>
					</thead>
					<tbody>
						{keymapItems.filter(({ command }) => {
							const filterLowerCase = filter.toLowerCase();
							return (command.toLowerCase().includes(filterLowerCase) || getLabel(command).toLowerCase().includes(filterLowerCase));
						}).map(item => renderKeymapRow(item))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

