import { _, _n } from '../locale';
import Note from '../models/Note';
import { CommandRuntime, CommandDeclaration, CommandContext } from '../services/CommandService';
import { MarkupLanguage } from '@joplin/renderer';
import { runtime as convertHtmlToMarkdown } from './convertHtmlToMarkdown';
import shim, { ToastType } from '../shim';
import { NoteEntity } from '../services/database/types';
import { itemIsReadOnly } from '../models/utils/readOnly';
import { ModelType } from '../BaseModel';
import ItemChange from '../models/ItemChange';
import Setting from '../models/Setting';
import Logger from '@joplin/utils/Logger';

const logger = Logger.create('convertNoteToMarkdown');

export const declaration: CommandDeclaration = {
	name: 'convertNoteToMarkdown',
	label: () => _('Convert to Markdown'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string|string[] = []) => {
			if (typeof noteIds === 'string') {
				noteIds = [noteIds];
			}
			if (noteIds.length === 0) {
				noteIds = context.state.selectedNoteIds;
			}

			const notes: NoteEntity[] = await Note.loadItemsByIdsOrFail(noteIds);

			try {
				let isFirst = true;
				let processedCount = 0;
				for (const note of notes) {
					if (note.markup_language === MarkupLanguage.Markdown) {
						logger.warn('Skipping item: Already Markdown.');
						continue;
					}
					if (await itemIsReadOnly(Note, ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, note.id, Setting.value('sync.userId'), context.state.shareService)) {
						throw new Error(_('Cannot convert read-only item: "%s"', note.title));
					}

					const markdownBody = await convertHtmlToMarkdown().execute(context, note.body);
					const newNote = await Note.duplicate(note.id);

					newNote.body = markdownBody;
					newNote.markup_language = MarkupLanguage.Markdown;

					await Note.save(newNote);
					await Note.delete(note.id, { toTrash: true });
					processedCount ++;

					if (isFirst) {
						context.dispatch({
							type: 'NOTE_SELECT',
							id: newNote.id,
						});
						isFirst = false;
					}
				}

				void shim.showToast(_n(
					'The note has been converted to Markdown and the original note has been moved to the trash',
					'The notes have been converted to Markdown and the original notes have been moved to the trash',
					processedCount,
				), { type: ToastType.Success });
			} catch (error) {
				await shim.showErrorDialog(_('Could not convert notes to Markdown: %s', error.message));
			}
		},
		enabledCondition: 'selectionIncludesHtmlNotes && (multipleNotesSelected || !noteIsReadOnly)',
	};
};
