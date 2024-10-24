import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import shim from '@joplin/lib/shim';
import InteropServiceHelper from '../../../InteropServiceHelper';
import { _ } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import bridge from '../../../services/bridge';

export const declaration: CommandDeclaration = {
	name: 'exportPdf',
	label: () => `PDF - ${_('PDF File')}`,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			try {
				noteIds = noteIds || context.state.selectedNoteIds;

				if (!noteIds.length) throw new Error('No notes selected for pdf export');

				let path = null;
				if (noteIds.length === 1) {
					path = await bridge().showSaveDialog({
						filters: [{ name: _('PDF File'), extensions: ['pdf'] }],
						defaultPath: await InteropServiceHelper.defaultFilename(noteIds[0], 'pdf'),
					});
				} else {
					path = await bridge().showOpenDialog({
						properties: ['openDirectory', 'createDirectory'],
					});
				}

				if (Array.isArray(path)) {
					if (path.length > 1) {
						throw new Error('Only one output directory can be selected');
					}

					path = path[0];
				}

				if (!path) return;

				for (let i = 0; i < noteIds.length; i++) {
					const note = await Note.load(noteIds[i]);

					let pdfPath = '';

					if (noteIds.length === 1) {
						pdfPath = path;
					} else {
						const n = await InteropServiceHelper.defaultFilename(note.id, 'pdf');
						pdfPath = await shim.fsDriver().findUniqueFilename(`${path}/${n}`);
					}

					await comp.printTo_('pdf', { path: pdfPath, noteId: note.id });
				}
			} catch (error) {
				console.error(error);
				bridge().showErrorMessageBox(error.message);
			}
		},

		enabledCondition: 'someNotesSelected',
	};
};
