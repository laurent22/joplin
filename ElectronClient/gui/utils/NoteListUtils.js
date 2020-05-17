const BaseModel = require('lib/BaseModel');
const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');
const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const eventManager = require('../../eventManager');
const InteropService = require('lib/services/InteropService');
const InteropServiceHelper = require('../../InteropServiceHelper.js');
const Note = require('lib/models/Note');
const Tag = require('lib/models/Tag');
const ExternalEditWatcher = require('lib/services/ExternalEditWatcher');
const { substrWithEllipsis } = require('lib/string-utils');
const { TRASH_TAG_ID } = require('lib/reserved-ids.js');

class NoteListUtils {
	static makeContextMenu(noteIds, props) {
		const menu = new Menu();
		const notes = noteIds.map(id => BaseModel.byId(props.notes, id));
		let hasEncrypted = false;
		for (let i = 0; i < notes.length; i++) {
			if (!notes[i]) return menu;
			if (notes[i].encryption_applied) hasEncrypted = true;
		}

		if (!props.isViewingTrash) {

			if (!hasEncrypted) {
				menu.append(
					new MenuItem({
						label: _('Add or remove tags'),
						click: async () => {
							props.dispatch({
								type: 'WINDOW_COMMAND',
								name: 'setTags',
								noteIds: noteIds,
							});
						},
					})
				);

				menu.append(
					new MenuItem({
						label: _('Move to notebook'),
						click: () => {
							props.dispatch({
								type: 'WINDOW_COMMAND',
								name: 'moveToFolder',
								noteIds: noteIds,
							});
						},
					})
				);

				menu.append(
					new MenuItem({
						label: _('Duplicate'),
						click: async () => {
							for (let i = 0; i < noteIds.length; i++) {
								const note = await Note.load(noteIds[i]);
								await Note.duplicate(noteIds[i], {
									uniqueTitle: _('%s - Copy', note.title),
								});
							}
						},
					})
				);

				if (props.watchedNoteFiles.indexOf(noteIds[0]) < 0) {
					menu.append(
						new MenuItem({
							label: _('Edit in external editor'),
							enabled: noteIds.length === 1,
							click: async () => {
								this.startExternalEditing(noteIds[0]);
							},
						})
					);
				} else {
					menu.append(
						new MenuItem({
							label: _('Stop external editing'),
							enabled: noteIds.length === 1,
							click: async () => {
								this.stopExternalEditing(noteIds[0]);
							},
						})
					);
				}

				if (noteIds.length <= 1) {
					menu.append(
						new MenuItem({
							label: _('Switch between note and to-do type'),
							click: async () => {
								for (let i = 0; i < noteIds.length; i++) {
									const note = await Note.load(noteIds[i]);
									const newNote = await Note.save(Note.toggleIsTodo(note), { userSideValidation: true });
									const eventNote = {
										id: newNote.id,
										is_todo: newNote.is_todo,
										todo_due: newNote.todo_due,
										todo_completed: newNote.todo_completed,
									};
									eventManager.emit('noteTypeToggle', { noteId: note.id, note: eventNote });
								}
							},
						})
					);
				} else {
					const switchNoteType = async (noteIds, type) => {
						for (let i = 0; i < noteIds.length; i++) {
							const note = await Note.load(noteIds[i]);
							const newNote = Note.changeNoteType(note, type);
							if (newNote === note) continue;
							await Note.save(newNote, { userSideValidation: true });
							eventManager.emit('noteTypeToggle', { noteId: note.id });
						}
					};

					menu.append(
						new MenuItem({
							label: _('Switch to note type'),
							click: async () => {
								await switchNoteType(noteIds, 'note');
							},
						})
					);

					menu.append(
						new MenuItem({
							label: _('Switch to to-do type'),
							click: async () => {
								await switchNoteType(noteIds, 'todo');
							},
						})
					);
				}

				menu.append(
					new MenuItem({
						label: _('Copy Markdown link'),
						click: async () => {
							const { clipboard } = require('electron');
							const links = [];
							for (let i = 0; i < noteIds.length; i++) {
								const note = await Note.load(noteIds[i]);
								links.push(Note.markdownTag(note));
							}
							clipboard.writeText(links.join(' '));
						},
					})
				);

				menu.append(
					new MenuItem({
						label: _('Share note...'),
						click: async () => {
							console.info('NOTE IDS', noteIds);
							props.dispatch({
								type: 'WINDOW_COMMAND',
								name: 'commandShareNoteDialog',
								noteIds: noteIds.slice(),
							});
						},
					})
				);

				const exportMenu = new Menu();

				const ioService = new InteropService();
				const ioModules = ioService.modules();
				for (let i = 0; i < ioModules.length; i++) {
					const module = ioModules[i];
					if (module.type !== 'exporter') continue;
					if (noteIds.length > 1 && module.canDoMultiExport === false) continue;

					exportMenu.append(
						new MenuItem({
							label: module.fullLabel(),
							click: async () => {
								await InteropServiceHelper.export(props.dispatch.bind(this), module, { sourceNoteIds: noteIds });
							},
						})
					);
				}

				exportMenu.append(
					new MenuItem({
						label: `PDF - ${_('PDF File')}`,
						click: () => {
							props.dispatch({
								type: 'WINDOW_COMMAND',
								name: 'exportPdf',
								noteId: noteIds,
							});
						},
					})
				);

				const exportMenuItem = new MenuItem({ label: _('Export'), submenu: exportMenu });
				menu.append(exportMenuItem);
			}

			menu.append(
				new MenuItem({
					label: _('Delete'),
					click: async () => {
						await Note.batchDelete(noteIds, { permanent: false });
					},
				})
			);

		} else  {
			menu.append(
				new MenuItem({
					label: _('Restore'),
					click: async () => {
						await Note.undelete(noteIds);
					},
				})
			);
			menu.append(
				new MenuItem({
					label: _('Delete'),
					click: async () => {
						await this.confirmDeleteNotes(noteIds, true);
					},
				})
			);
			menu.append(
				new MenuItem({
					label: _('Empty trash'),
					click: async () => {
						const trashNoteIds = await Tag.noteIds(TRASH_TAG_ID);
						await this.confirmDeleteNotes(trashNoteIds, true);
					},
				})
			);
		}

		return menu;
	}

	static async confirmDeleteNotes(noteIds) {
		if (!noteIds.length) return;

		let msg = '';
		if (noteIds.length === 1) {
			const note = await Note.load(noteIds[0]);
			if (!note) return;
			msg = _('Permanently delete note "%s"?', substrWithEllipsis(note.title, 0, 32));
		} else {
			msg = _('Permanently delete these %d notes?', noteIds.length);
		}

		const ok = bridge().showConfirmMessageBox(msg, {
			buttons: [_('Delete'), _('Cancel')],
			defaultId: 1,
		});

		if (!ok) return;
		await Note.batchDelete(noteIds);
	}

	static async startExternalEditing(noteId) {
		try {
			const note = await Note.load(noteId);
			ExternalEditWatcher.instance().openAndWatch(note);
		} catch (error) {
			bridge().showErrorMessageBox(_('Error opening note in editor: %s', error.message));
		}
	}

	static async stopExternalEditing(noteId) {
		ExternalEditWatcher.instance().stopWatching(noteId);
	}

}

module.exports = NoteListUtils;
