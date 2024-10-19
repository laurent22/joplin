import * as React from 'react';
import { useState } from 'react';

import KeymapService, { KeymapItem } from '@joplin/lib/services/KeymapService';
import { ShortcutRecorder } from './ShortcutRecorder';
import getLabel from './utils/getLabel';
import useKeymap from './utils/useKeymap';
import useCommandStatus from './utils/useCommandStatus';
import styles_ from './styles';
import { _ } from '@joplin/lib/locale';

import shim from '@joplin/lib/shim';
import bridge from '../../services/bridge';

const keymapService = KeymapService.instance();

export interface KeymapConfigScreenProps {
	themeId: number;
}

export const KeymapConfigScreen = ({ themeId }: KeymapConfigScreenProps) => {
	const styles = styles_(themeId);

	const [filter, setFilter] = useState('');
	const [keymapItems, keymapError, overrideKeymapItems, setAccelerator, resetAccelerator] = useKeymap();
	const [recorderError, setRecorderError] = useState<Error>(null);
	const [editing, enableEditing, disableEditing] = useCommandStatus();

	const handleSave = (event: { commandName: string; accelerator: string }) => {
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
		const filePath = await bridge().showOpenDialog({
			properties: ['openFile'],
			defaultPath: 'keymap-desktop',
			filters: [{ name: 'Joplin Keymaps (keymap-desktop.json)', extensions: ['json'] }],
		});

		if (filePath && filePath.length !== 0) {
			const actualFilePath = filePath[0];
			try {
				const keymapFile = await shim.fsDriver().readFile(actualFilePath, 'utf-8');
				overrideKeymapItems(JSON.parse(keymapFile));
			} catch (error) {
				bridge().showErrorMessageBox(_('Error: %s', error.message));
			}
		}
	};

	const handleExport = async () => {
		const filePath = await bridge().showSaveDialog({
			defaultPath: 'keymap-desktop',
			filters: [{ name: 'Joplin Keymaps (keymap-desktop.json)', extensions: ['json'] }],
		});

		if (filePath) {
			try {
				// KeymapService is already synchronized with the in-state keymap
				await keymapService.saveCustomKeymap(filePath);
			} catch (error) {
				bridge().showErrorMessageBox(error.message);
			}
		}
	};

	const renderAccelerator = (accelerator: string) => {
		return (
			<div>
				{accelerator.split('+').map(part => <kbd style={styles.kbd} key={part}>{part}</kbd>).reduce(
					(accumulator, part) => (accumulator.length ? [...accumulator, ' + ', part] : [part]),
					[],
				)}
			</div>
		);
	};

	const renderStatus = (commandName: string) => {
		if (!editing[commandName]) {
			const editLabel = _('Change shortcut for "%s"', getLabel(commandName));
			return <i className="fa fa-pen" role='img' aria-label={editLabel} title={editLabel}/>;
		} else if (recorderError) {
			return <i className="fa fa-exclamation-triangle" role='img' aria-label={recorderError.message} title={recorderError.message} />;
		}

		return null;
	};

	const renderError = (error: Error) => {
		return (
			<div style={{ ...styles.warning, position: 'absolute', top: 0 }}>
				<p style={styles.text}>
					<span>
						{error.message}
					</span>
				</p>
			</div>
		);
	};

	const renderKeymapRow = ({ command, accelerator }: KeymapItem) => {
		const handleClick = () => {
			if (!editing[command]) {
				enableEditing(command);
			} else if (recorderError) {
				void bridge().showErrorMessageBox(recorderError.message);
			}
		};
		const statusContent = renderStatus(command);
		const cellContent =
			<div className='keymap-shortcut-row-content'>
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
				<button
					className={`flat-button edit ${editing[command] ? '-editing' : ''}`}
					style={styles.tableCellStatus}
					aria-live={recorderError ? 'polite' : null}
					tabIndex={statusContent ? 0 : -1}
					onClick={handleClick}
				>
					{statusContent}
				</button>
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

