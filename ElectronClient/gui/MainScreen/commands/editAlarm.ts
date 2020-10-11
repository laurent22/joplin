import { CommandRuntime, CommandDeclaration } from '../../../lib/services/CommandService';
import eventManager from 'lib/eventManager';
import { _ } from 'lib/locale';
const Note = require('lib/models/Note');
const BaseModel = require('lib/BaseModel');
const { time } = require('lib/time-utils');

export const declaration:CommandDeclaration = {
	name: 'editAlarm',
	label: () => _('Set alarm'),
	iconName: 'icon-alarm',
};

export const runtime = (comp:any):CommandRuntime => {
	return {
		execute: async ({ noteId }:any) => {
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
					onClose: async (answer:any, buttonType:string) => {
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
							eventManager.emit('alarmChange', { noteId: note.id, note: newNote });
						}

						comp.setState({ promptOptions: null });
					},
				},
			});
		},
		title: (props:any):string => {
			if (!props.noteId) return null;
			if (!props.noteTodoDue) return null;
			return time.formatMsToLocal(props.noteTodoDue);
		},
		isEnabled: (props:any):boolean => {
			if (!props.noteId) return false;
			return !!props.noteIsTodo && !props.noteTodoCompleted;
		},
		mapStateToProps: (state:any):any => {
			const noteId = state.selectedNoteIds.length === 1 ? state.selectedNoteIds[0] : null;
			const note = noteId ? BaseModel.byId(state.notes, noteId) : null;

			return {
				noteId: note ? noteId : null,
				noteIsTodo: note ? note.is_todo : false,
				noteTodoCompleted: note ? note.todo_completed : false,
				noteTodoDue: note ? note.todo_due : null,
			};
		},
	};
};
