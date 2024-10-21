import { utils as pluginUtils, PluginStates } from '@joplin/lib/services/plugins/reducer';
import CommandService from '@joplin/lib/services/CommandService';
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
import { NoteEntity } from '@joplin/lib/services/database/types';

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;

interface ContextMenuProps {
	notes: NoteEntity[];
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

		const notes: NoteEntity[] = BaseModel.modelsByIds(props.notes, noteIds);

		const singleNoteId = noteIds.length === 1 ? noteIds[0] : null;

		const includeDeletedNotes = notes.find(n => !!n.deleted_time);
		const includeEncryptedNotes = notes.find(n => !!n.encryption_applied);

		const menu = new Menu();

		if (!includeEncryptedNotes && !includeDeletedNotes) {
			menu.append(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				new MenuItem(menuUtils.commandToStatefulMenuItem('setTags', noteIds) as any),
			);

			menu.append(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				new MenuItem(menuUtils.commandToStatefulMenuItem('moveToFolder', noteIds) as any),
			);

			menu.append(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				new MenuItem(menuUtils.commandToStatefulMenuItem('duplicateNote', noteIds) as any),
			);

			if (singleNoteId) {
				const editInMenu = new Menu();

				const cmd = props.watchedNoteFiles.includes(singleNoteId) ? 'stopExternalEditing' : 'startExternalEditing';
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				editInMenu.append(new MenuItem(menuUtils.commandToStatefulMenuItem(cmd, singleNoteId) as any));
				editInMenu.append(
					new MenuItem(menuUtils.commandToStatefulMenuItem('openNoteInNewWindow', singleNoteId)),
				);

				menu.append(new MenuItem({ label: _('Edit in...'), submenu: editInMenu }));
			}


			if (noteIds.length <= 1) {
				menu.append(
					new MenuItem(
						// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
						// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
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
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					menuUtils.commandToStatefulMenuItem('exportPdf', noteIds) as any,
				),
			);

			const exportMenuItem = new MenuItem({ label: _('Export'), submenu: exportMenu });

			menu.append(exportMenuItem);
		}

		if (includeDeletedNotes) {
			menu.append(
				new MenuItem(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					menuUtils.commandToStatefulMenuItem('restoreNote', noteIds) as any,
				),
			);

			menu.append(
				new MenuItem(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					menuUtils.commandToStatefulMenuItem('permanentlyDeleteNote', noteIds) as any,
				),
			);
		} else {
			menu.append(
				new MenuItem(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					menuUtils.commandToStatefulMenuItem('deleteNote', noteIds) as any,
				),
			);
		}

		const pluginViewInfos = pluginUtils.viewInfosByType(props.plugins, 'menuItem');

		for (const info of pluginViewInfos) {
			const location = info.view.location;
			if (location !== MenuItemLocation.Context && location !== MenuItemLocation.NoteListContextMenu) continue;

			if (cmdService.isEnabled(info.view.commandName)) {
				menu.append(
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					new MenuItem(menuUtils.commandToStatefulMenuItem(info.view.commandName, noteIds) as any),
				);
			}
		}

		return menu;
	}

}
