import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import Note from '@joplin/lib/models/Note';
import time from '@joplin/lib/time';
import { formatMsToDateTimeLocal } from '@joplin/utils/time';
import { NoteEntity } from '@joplin/lib/services/database/types';
import { RecurrenceInterval, recurrenceLabel, allRecurrenceIntervals } from '@joplin/lib/utils/recurrence';

export const declaration: CommandDeclaration = {
	name: 'editAlarm',
	label: () => _('Set alarm'),
	iconName: 'icon-alarm',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			const note = await Note.load(noteId);

			const defaultDate = new Date(Date.now() + 2 * 3600 * 1000);
			defaultDate.setMinutes(0);
			defaultDate.setSeconds(0);

			const recurrenceOptions = allRecurrenceIntervals().map((interval) => ({
				value: interval,
				label: recurrenceLabel(interval),
			}));

			comp.setState({
				promptOptions: {
					label: _('Set alarm:'),
					inputType: 'datetime',
					buttons: ['ok', 'cancel', 'clear'],
					value: note.todo_due ? formatMsToDateTimeLocal(note.todo_due) : formatMsToDateTimeLocal(defaultDate.getTime()),
					recurrence: {
						label: _('Repeat:'),
						options: recurrenceOptions,
						value: note.todo_due_recurrence || RecurrenceInterval.None,
					},
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					onClose: async (answer: any, buttonType: string, recurrenceValue?: string) => {
						let newNote: NoteEntity = null;

						if (buttonType === 'clear') {
							newNote = {
								id: note.id,
								todo_due: 0,
								todo_due_recurrence: '',
							};
						} else if (answer !== null) {
							newNote = {
								id: note.id,
								todo_due: answer,
								todo_due_recurrence: recurrenceValue || '',
							};
						}

						if (newNote) {
							await Note.save(newNote);
							eventManager.emit(EventName.AlarmChange, { noteId: note.id, note: newNote });
						}

						comp.setState({ promptOptions: null });
					},
				},
			});
		},

		enabledCondition: 'oneNoteSelected && noteIsTodo && !noteTodoCompleted',

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		mapStateToTitle: (state: any) => {
			const note = stateUtils.selectedNote(state);
			return note && note.todo_due ? time.formatMsToLocal(note.todo_due) : null;
		},
	};
};

