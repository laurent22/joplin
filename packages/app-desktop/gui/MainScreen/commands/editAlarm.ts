import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import Note from '@joplin/lib/models/Note';
import time from '@joplin/lib/time';

export const declaration: CommandDeclaration = {
	name: 'editAlarm',
	label: () => _('Set alarm'),
	iconName: 'icon-alarm',
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			const note = await Note.load(noteId);

			const defaultDate = new Date(Date.now() + 2 * 3600 * 1000);
			defaultDate.setMinutes(0);
			defaultDate.setSeconds(0);

			comp.setState({
				promptOptions: {
					label: _('Set alarm:'),
					inputType: 'datetime',
					buttons: ['ok', 'cancel', 'clear'],
					value: note.todo_due ? new Date(note.todo_due) : defaultDate,
					onClose: async (answer: any, buttonType: string) => {
						let newNote = null;

						if (buttonType === 'clear') {
							newNote = {
								id: note.id,
								todo_due: 0,
							};
						} else if (answer !== null) {
							newNote = {
								id: note.id,
								todo_due: answer.getTime(),
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

		mapStateToTitle: (state: any) => {
			const note = stateUtils.selectedNote(state);
			return note && note.todo_due ? time.formatMsToLocal(note.todo_due) : null;
		},
	};
};
