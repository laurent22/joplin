import { utils as pluginUtils, PluginStates } from '@joplin/lib/services/plugins/reducer';
import CommandService from '@joplin/lib/services/CommandService';
import eventManager from '@joplin/lib/eventManager';
import InteropService from '@joplin/lib/services/interop/InteropService';
import MenuUtils from '@joplin/lib/services/commands/MenuUtils';
import InteropServiceHelper from '../../InteropServiceHelper';
import { _ } from '@joplin/lib/locale';
import { MenuItemLocation } from '@joplin/lib/services/plugins/api/types';
import { getNoteCallbackUrl } from '@joplin/lib/callbackUrlUtils';
import bridge from '../../services/bridge';
import BaseModel from '@joplin/lib/BaseModel';
import Note from '@joplin/lib/models/Note';
import Setting from '@joplin/lib/models/Setting';
const { clipboard } = require('electron');
import { Dispatch } from 'redux';

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;

interface ContextMenuProps {
	notes: any[];
	dispatch: Dispatch;
	watchedNoteFiles: string[];
	plugins: PluginStates;
	inConflictFolder: boolean;
	customCss: string;
}

export default class NoteListUtils {
	public static makeContextMenu(noteIds: string[], props: ContextMenuProps) {
		const cmdService = CommandService.instance();

		const menuUtils = new MenuUtils(cmdService);

		const notes = noteIds.map(id => BaseModel.byId(props.notes, id));

		const singleNoteId = noteIds.length === 1 ? noteIds[0] : null;

		let hasEncrypted = false;
		for (let i = 0; i < notes.length; i++) {
			if (notes[i].encryption_applied) hasEncrypted = true;
		}

		const menu = new Menu();

		if (!hasEncrypted) {
			menu.append(
				new MenuItem(menuUtils.commandToStatefulMenuItem('setTags', noteIds) as any),
			);

			menu.append(
				new MenuItem(menuUtils.commandToStatefulMenuItem('moveToFolder', noteIds) as any),
			);

			menu.append(
				new MenuItem(menuUtils.commandToStatefulMenuItem('duplicateNote', noteIds) as any),
			);

			if (singleNoteId) {
				const cmd = props.watchedNoteFiles.includes(singleNoteId) ? 'stopExternalEditing' : 'startExternalEditing';
				menu.append(new MenuItem(menuUtils.commandToStatefulMenuItem(cmd, singleNoteId) as any));
			}

			if (noteIds.length <= 1) {
				menu.append(
					new MenuItem(
						menuUtils.commandToStatefulMenuItem('toggleNoteType', noteIds) as any,
					),
				);
			} else {
				const switchNoteType = async (noteIds: string[], type: string) => {
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
					}),
				);

				menu.append(
					new MenuItem({
						label: _('Switch to to-do type'),
						click: async () => {
							await switchNoteType(noteIds, 'todo');
						},
					}),
				);
			}

			menu.append(
				new MenuItem({
					label: _('Copy Markdown link'),
					click: async () => {
						const links = [];
						for (let i = 0; i < noteIds.length; i++) {
							const note = await Note.load(noteIds[i]);
							links.push(Note.markdownTag(note));
						}
						clipboard.writeText(links.join(' '));
					},
				}),
			);

			if (noteIds.length === 1) {
				menu.append(
					new MenuItem({
						label: _('Copy external link'),
						click: () => {
							clipboard.writeText(getNoteCallbackUrl(noteIds[0]));
						},
					}),
				);
			}

			if ([9, 10].includes(Setting.value('sync.target'))) {
				menu.append(
					new MenuItem(
						menuUtils.commandToStatefulMenuItem('showShareNoteDialog', noteIds.slice()) as any,
					),
				);
			}

			const exportMenu = new Menu();

			const ioService = InteropService.instance();
			const ioModules = ioService.modules();
			for (let i = 0; i < ioModules.length; i++) {
				const module = ioModules[i];
				if (module.type !== 'exporter') continue;
				if (noteIds.length > 1 && module.isNoteArchive === false) continue;

				exportMenu.append(
					new MenuItem({
						label: module.fullLabel(),
						click: async () => {
							await InteropServiceHelper.export(props.dispatch.bind(this), module, {
								sourceNoteIds: noteIds,
								includeConflicts: props.inConflictFolder,
								plugins: props.plugins,
								customCss: props.customCss,
							});
						},
					}),
				);
			}

			exportMenu.append(
				new MenuItem(
					menuUtils.commandToStatefulMenuItem('exportPdf', noteIds) as any,
				),
			);

			const exportMenuItem = new MenuItem({ label: _('Export'), submenu: exportMenu });

			menu.append(exportMenuItem);
		}

		menu.append(
			new MenuItem(
				menuUtils.commandToStatefulMenuItem('deleteNote', noteIds) as any,
			),
		);

		const pluginViewInfos = pluginUtils.viewInfosByType(props.plugins, 'menuItem');

		for (const info of pluginViewInfos) {
			const location = info.view.location;
			if (location !== MenuItemLocation.Context && location !== MenuItemLocation.NoteListContextMenu) continue;

			if (cmdService.isEnabled(info.view.commandName)) {
				menu.append(
					new MenuItem(menuUtils.commandToStatefulMenuItem(info.view.commandName, noteIds) as any),
				);
			}
		}

		return menu;
	}

}
