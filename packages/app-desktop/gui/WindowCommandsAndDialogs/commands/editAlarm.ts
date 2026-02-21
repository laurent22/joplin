import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import eventManager, { EventName } from '@joplin/lib/eventManager';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
import Note from '@joplin/lib/models/Note';
import time from '@joplin/lib/time';
import { formatMsToDateTimeLocal } from '@joplin/utils/time';
import { NoteEntity } from '@joplin/lib/services/database/types';

const recurrenceToOption = (recurrence: string) => {
	const normalized = recurrence ? recurrence.toUpperCase() : '';
	if (normalized.includes('FREQ=DAILY')) return 'DAILY';
	if (normalized.includes('FREQ=WEEKLY')) return 'WEEKLY';
	if (normalized.includes('FREQ=MONTHLY')) return 'MONTHLY';
	if (normalized.includes('FREQ=YEARLY')) return 'YEARLY';
	return 'NONE';
};

const recurrenceOptionLabel = (option: string) => {
	if (option === 'DAILY') return _('Daily');
	if (option === 'WEEKLY') return _('Weekly');
	if (option === 'MONTHLY') return _('Monthly');
	if (option === 'YEARLY') return _('Yearly');
	return _('Never');
};

const optionToRecurrence = (option: string) => {
	if (option === 'DAILY') return 'FREQ=DAILY';
	if (option === 'WEEKLY') return 'FREQ=WEEKLY';
	if (option === 'MONTHLY') return 'FREQ=MONTHLY';
	if (option === 'YEARLY') return 'FREQ=YEARLY';
	return '';
};

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

			comp.setState({
				promptOptions: {
					label: _('Set alarm:'),
					inputType: 'datetime',
					buttons: ['ok', 'cancel', 'clear'],
					value: note.todo_due ? formatMsToDateTimeLocal(note.todo_due) : formatMsToDateTimeLocal(defaultDate.getTime()),
					// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
					onClose: async (answer: any, buttonType: string) => {
						if (buttonType === 'clear') {
							const newNote: NoteEntity = {
								id: note.id,
								todo_due: 0,
								alarm_recurrence: '',
							};

							await Note.save(newNote);
							eventManager.emit(EventName.AlarmChange, { noteId: note.id, note: newNote });
							comp.setState({ promptOptions: null });
							return;
						}

						if (answer === null) {
							comp.setState({ promptOptions: null });
							return;
						}

						const selectedOption = recurrenceToOption(note.alarm_recurrence);

						comp.setState({
							promptOptions: {
								label: _('Repeat:'),
								inputType: 'dropdown',
								buttons: ['ok', 'cancel'],
								autocomplete: [
									{ value: 'NONE', label: _('Never') },
									{ value: 'DAILY', label: _('Daily') },
									{ value: 'WEEKLY', label: _('Weekly') },
									{ value: 'MONTHLY', label: _('Monthly') },
									{ value: 'YEARLY', label: _('Yearly') },
								],
								value: { value: selectedOption, label: recurrenceOptionLabel(selectedOption) },
								onClose: async (repeatAnswer: { value: string }|null) => {
									let newNote: NoteEntity = null;
									if (repeatAnswer !== null) {
										newNote = {
											id: note.id,
											todo_due: answer,
											alarm_recurrence: optionToRecurrence(repeatAnswer.value),
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
