'use strict';
const __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
	function adopt(value) { return value instanceof P ? value : new P(function(resolve) { resolve(value); }); }
	return new (P || (P = Promise))(function(resolve, reject) {
		function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
		function rejected(value) { try { step(generator['throw'](value)); } catch (e) { reject(e); } }
		function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
		step((generator = generator.apply(thisArg, _arguments || [])).next());
	});
};
Object.defineProperty(exports, '__esModule', { value: true });
const React = require('react');
const react_1 = require('react');
const ShortcutRecorder_1 = require('./ShortcutRecorder');
const getLabel_1 = require('./utils/getLabel');
const useKeymap_1 = require('./utils/useKeymap');
const useCommandStatus_1 = require('./utils/useCommandStatus');
const styles_1 = require('./styles');
const { bridge } = require('electron').remote.require('./bridge');
const { shim } = require('lib/shim');
const { _ } = require('lib/locale');
exports.KeymapConfigScreen = ({ themeId }) => {
	const styles = styles_1.default(themeId);
	const [filter, setFilter] = react_1.useState('');
	const [keymapItems, keymapError, overrideKeymapItems, exportCustomKeymap, setAccelerator, resetAccelerator] = useKeymap_1.default();
	const [recorderError, setRecorderError] = react_1.useState(null);
	const [editing, enableEditing, disableEditing] = useCommandStatus_1.default();
	const [hovering, enableHovering, disableHovering] = useCommandStatus_1.default();
	const handleSave = (event) => {
		const { commandName, accelerator } = event;
		setAccelerator(commandName, accelerator);
		disableEditing(commandName);
	};
	const handleReset = (event) => {
		const { commandName } = event;
		resetAccelerator(commandName);
		disableEditing(commandName);
	};
	const handleCancel = (event) => {
		const { commandName } = event;
		disableEditing(commandName);
	};
	const handleError = (event) => {
		const { recorderError } = event;
		setRecorderError(recorderError);
	};
	const handleImport = () => __awaiter(void 0, void 0, void 0, function* () {
		const filePath = bridge().showOpenDialog({
			properties: ['openFile'],
			defaultPath: 'keymap-desktop',
			filters: [{ name: 'Joplin Keymaps (keymap-desktop.json)', extensions: ['json'] }],
		});
		if (filePath) {
			const actualFilePath = filePath[0];
			try {
				const keymapFile = yield shim.fsDriver().readFile(actualFilePath, 'utf-8');
				overrideKeymapItems(JSON.parse(keymapFile));
			} catch (err) {
				bridge().showErrorMessageBox(`${_('An unexpected error occured while importing the keymap!')}\n${err.message}`);
			}
		}
	});
	const handleExport = () => __awaiter(void 0, void 0, void 0, function* () {
		const filePath = bridge().showSaveDialog({
			defaultPath: 'keymap-desktop',
			filters: [{ name: 'Joplin Keymaps (keymap-desktop.json)', extensions: ['json'] }],
		});
		if (filePath) {
			try {
				// KeymapService is already synchronized with the in-state keymap
				yield exportCustomKeymap(filePath);
			} catch (err) {
				bridge().showErrorMessageBox(`${_('An unexpected error occured while exporting the keymap!')}\n${err.message}`);
			}
		}
	});
	const renderAccelerator = (accelerator) => {
		return (React.createElement('div', null, accelerator.split('+').map(part => React.createElement('kbd', { style: styles.kbd, key: part }, part)).reduce((accumulator, part) => (accumulator.length ? [...accumulator, ' + ', part] : [part]), [])));
	};
	const renderStatus = (commandName) => {
		if (editing[commandName]) {
			return (recorderError && React.createElement('i', { className: 'fa fa-exclamation-triangle' }));
		} else if (hovering[commandName]) {
			return (React.createElement('i', { className: 'fa fa-pen' }));
		} else {
			return null;
		}
	};
	const renderError = (error) => {
		return (React.createElement('div', { style: styles.warning },
			React.createElement('p', { style: styles.text },
				React.createElement('span', null, error.message))));
	};
	const renderKeymapRow = ({ command, accelerator }) => {
		const handleClick = () => enableEditing(command);
		const handleMouseEnter = () => enableHovering(command);
		const handleMouseLeave = () => disableHovering(command);
		const cellContent = React.createElement('div', { style: styles.tableCell, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave },
			editing[command] ?
				React.createElement(ShortcutRecorder_1.ShortcutRecorder, { onSave: handleSave, onReset: handleReset, onCancel: handleCancel, onError: handleError, initialAccelerator: accelerator || '' /* Because accelerator is null if disabled */, commandName: command, themeId: themeId }) :
				React.createElement('div', { style: styles.tableCellContent, onClick: handleClick }, accelerator
					? renderAccelerator(accelerator)
					: React.createElement('div', { style: styles.disabled }, _('Disabled'))),
			React.createElement('div', { style: styles.tableCellStatus, onClick: handleClick }, renderStatus(command)));
		return (React.createElement('tr', { key: command },
			React.createElement('td', { style: styles.tableCommandColumn }, getLabel_1.default(command)),
			React.createElement('td', { style: styles.tableShortcutColumn }, cellContent)));
	};
	return (React.createElement('div', null,
		keymapError && renderError(keymapError),
		React.createElement('div', { style: styles.container },
			React.createElement('div', { style: styles.actionsContainer },
				React.createElement('label', { style: styles.label }, _('Search')),
				React.createElement('input', { value: filter, onChange: event => setFilter(event.target.value), placeholder: _('Search...'), style: styles.filterInput }),
				React.createElement('button', { style: styles.inlineButton, onClick: handleImport }, _('Import')),
				React.createElement('button', { style: styles.inlineButton, onClick: handleExport }, _('Export'))),
			React.createElement('table', { style: styles.table },
				React.createElement('thead', null,
					React.createElement('tr', null,
						React.createElement('th', { style: styles.tableCommandColumn }, _('Command')),
						React.createElement('th', { style: styles.tableShortcutColumn }, _('Keyboard Shortcut')))),
				React.createElement('tbody', null, keymapItems.filter(({ command }) => {
					const filterLowerCase = filter.toLowerCase();
					return (command.toLowerCase().includes(filterLowerCase) || getLabel_1.default(command).toLowerCase().includes(filterLowerCase));
				}).map(item => renderKeymapRow(item)))))));
};
// # sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiS2V5bWFwQ29uZmlnU2NyZWVuLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiS2V5bWFwQ29uZmlnU2NyZWVuLnRzeCJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLCtCQUErQjtBQUMvQixpQ0FBaUM7QUFHakMseURBQXNEO0FBQ3RELCtDQUF3QztBQUN4QyxpREFBMEM7QUFDMUMsK0RBQXdEO0FBQ3hELHFDQUErQjtBQUUvQixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDbEUsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNyQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEdBQUcsT0FBTyxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBTXZCLFFBQUEsa0JBQWtCLEdBQUcsQ0FBQyxFQUFFLE9BQU8sRUFBMkIsRUFBRSxFQUFFO0lBQzFFLE1BQU0sTUFBTSxHQUFHLGdCQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7SUFFaEMsTUFBTSxDQUFDLE1BQU0sRUFBRSxTQUFTLENBQUMsR0FBRyxnQkFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsV0FBVyxFQUFFLG1CQUFtQixFQUFFLGtCQUFrQixFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHLG1CQUFTLEVBQUUsQ0FBQztJQUMxSCxNQUFNLENBQUMsYUFBYSxFQUFFLGdCQUFnQixDQUFDLEdBQUcsZ0JBQVEsQ0FBUSxJQUFJLENBQUMsQ0FBQztJQUNoRSxNQUFNLENBQUMsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLENBQUMsR0FBRywwQkFBZ0IsRUFBRSxDQUFDO0lBQ3BFLE1BQU0sQ0FBQyxRQUFRLEVBQUUsY0FBYyxFQUFFLGVBQWUsQ0FBQyxHQUFHLDBCQUFnQixFQUFFLENBQUM7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
