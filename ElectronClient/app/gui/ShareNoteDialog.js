'use strict';
/* eslint-disable enforce-react-hooks/enforce-react-hooks */
var __awaiter = (this && this.__awaiter) || function(thisArg, _arguments, P, generator) {
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
const JoplinServerApi_1 = require('../lib/JoplinServerApi');
const { _, _n } = require('lib/locale.js');
const { themeStyle, buildStyle } = require('../theme.js');
const DialogButtonRow = require('./DialogButtonRow.min');
const Note = require('lib/models/Note');
const Setting = require('lib/models/Setting');
const BaseItem = require('lib/models/BaseItem');
const { reg } = require('lib/registry.js');
const { clipboard } = require('electron');
function styles_(props) {
	return buildStyle('ShareNoteDialog', props.theme, (theme) => {
		return {
			noteList: {
				marginBottom: 10,
			},
			note: {
				flex: 1,
				flexDirection: 'row',
				display: 'flex',
				alignItems: 'center',
				border: '1px solid',
				borderColor: theme.dividerColor,
				padding: '0.5em',
				marginBottom: 5,
			},
			noteTitle: Object.assign(Object.assign({}, theme.textStyle), { flex: 1, display: 'flex', color: theme.color }),
			noteRemoveButton: {
				background: 'none',
				border: 'none',
			},
			noteRemoveButtonIcon: {
				color: theme.color,
				fontSize: '1.4em',
			},
			copyShareLinkButton: Object.assign(Object.assign({}, theme.buttonStyle), { marginBottom: 10 }),
		};
	});
}
function ShareNoteDialog(props) {
	console.info('Render ShareNoteDialog');
	const [notes, setNotes] = react_1.useState([]);
	const [sharesState, setSharesState] = react_1.useState('unknown');
	const [shares, setShares] = react_1.useState({});
	const noteCount = notes.length;
	const theme = themeStyle(props.theme);
	const styles = styles_(props);
	react_1.useEffect(() => {
		function fetchNotes() {
			return __awaiter(this, void 0, void 0, function* () {
				const result = [];
				for (let noteId of props.noteIds) {
					result.push(yield Note.load(noteId));
				}
				setNotes(result);
			});
		}
		fetchNotes();
	}, [props.noteIds]);
	const appApi = () => __awaiter(this, void 0, void 0, function* () {
		return reg.syncTargetNextcloud().appApi();
	});
	const buttonRow_click = () => {
		props.onClose();
	};
	const copyLinksToClipboard = (shares) => {
		const links = [];
		for (const n in shares)
			links.push(shares[n]._url);
		clipboard.writeText(links.join('\n'));
	};
	const synchronize = () => __awaiter(this, void 0, void 0, function* () {
		const synchronizer = yield reg.syncTarget().synchronizer();
		yield synchronizer.waitForSyncToFinish();
		yield reg.scheduleSync(0);
	});
	const shareLinkButton_click = () => __awaiter(this, void 0, void 0, function* () {
		let hasSynced = false;
		let tryToSync = false;
		while (true) {
			try {
				if (tryToSync) {
					setSharesState('synchronizing');
					yield synchronize();
					tryToSync = false;
					hasSynced = true;
				}
				setSharesState('creating');
				const api = yield appApi();
				const syncTargetId = api.syncTargetId(Setting.toPlainObject());
				const newShares = Object.assign({}, shares);
				let sharedStatusChanged = false;
				for (const note of notes) {
					const result = yield api.exec('POST', 'shares', {
						syncTargetId: syncTargetId,
						noteId: note.id,
					});
					newShares[note.id] = result;
					const changed = yield BaseItem.updateShareStatus(note, true);
					if (changed)
						sharedStatusChanged = true;
				}
				setShares(newShares);
				if (sharedStatusChanged) {
					setSharesState('synchronizing');
					yield synchronize();
					setSharesState('creating');
				}
				copyLinksToClipboard(newShares);
				setSharesState('created');
			} catch (error) {
				if (error.code === 404 && !hasSynced) {
					reg.logger().info('ShareNoteDialog: Note does not exist on server - trying to sync it.', error);
					tryToSync = true;
					continue;
				}
				reg.logger().error('ShareNoteDialog: Cannot share note:', error);
				setSharesState('idle');
				alert(JoplinServerApi_1.default.connectionErrorMessage(error));
			}
			break;
		}
	});
	const removeNoteButton_click = (event) => {
		const newNotes = [];
		for (let i = 0; i < notes.length; i++) {
			const n = notes[i];
			if (n.id === event.noteId)
				continue;
			newNotes.push(n);
		}
		setNotes(newNotes);
	};
	const renderNote = (note) => {
		const removeButton = notes.length <= 1 ? null : (React.createElement('button', { onClick: () => removeNoteButton_click({ noteId: note.id }), style: styles.noteRemoveButton },
			React.createElement('i', { style: styles.noteRemoveButtonIcon, className: 'fa fa-times' })));
		return (React.createElement('div', { key: note.id, style: styles.note },
			React.createElement('span', { style: styles.noteTitle }, note.title),
			removeButton));
	};
	const renderNoteList = (notes) => {
		const noteComps = [];
		for (let noteId of Object.keys(notes)) {
			noteComps.push(renderNote(notes[noteId]));
		}
		return React.createElement('div', { style: styles.noteList }, noteComps);
	};
	const statusMessage = (sharesState) => {
		if (sharesState === 'synchronizing')
			return _('Synchronising...');
		if (sharesState === 'creating')
			return _n('Generating link...', 'Generating links...', noteCount);
		if (sharesState === 'created')
			return _n('Link has been copied to clipboard!', 'Links have been copied to clipboard!', noteCount);
		return '';
	};
	const encryptionWarningMessage = !Setting.value('encryption.enabled') ? null : React.createElement('div', { style: theme.textStyle }, _('Note: When a note is shared, it will no longer be encrypted on the server.'));
	const rootStyle = Object.assign({}, theme.dialogBox);
	rootStyle.width = '50%';
	return (React.createElement('div', { style: theme.dialogModalLayer },
		React.createElement('div', { style: rootStyle },
			React.createElement('div', { style: theme.dialogTitle }, _('Share Notes')),
			renderNoteList(notes),
			React.createElement('button', { disabled: ['creating', 'synchronizing'].indexOf(sharesState) >= 0, style: styles.copyShareLinkButton, onClick: shareLinkButton_click }, _n('Copy Shareable Link', 'Copy Shareable Links', noteCount)),
			React.createElement('div', { style: theme.textStyle }, statusMessage(sharesState)),
			encryptionWarningMessage,
			React.createElement(DialogButtonRow, { theme: props.theme, onClick: buttonRow_click, okButtonShow: false, cancelButtonLabel: _('Close') }))));
}
exports.default = ShareNoteDialog;
// # sourceMappingURL=ShareNoteDialog.js.map
