import * as React from 'react';
import { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Modal from '../../Modal';
import { themeStyle } from '../../global-style';
import { _ } from '@joplin/lib/locale';
import { NoteEntity } from '@joplin/lib/services/database/types';
import Note from '@joplin/lib/models/Note';
import { PrimaryButton } from '../../buttons';
import { Button } from 'react-native-paper';

interface Props {
	visible: boolean;
	selectedNote: NoteEntity | null;
	notes: NoteEntity[];
	onClose: ()=> void;
	onConfirm: (targetIndex: number)=> void;
	themeId: number;
	uncompletedTodosOnTop: boolean;
}

const MOVE_TO_TOP_VALUE = '__MOVE_TO_TOP__';
const MAX_NOTE_TITLE_LENGTH = 30;

const truncateTitle = (title: string, maxLength: number): string => {
	if (title.length <= maxLength) return title;
	return `${title.substring(0, maxLength - 3)}...`;
};

const isUncompletedTodo = (note: NoteEntity): boolean => {
	return !!note.is_todo && !note.todo_completed;
};

const getTodoPrefix = (note: NoteEntity): string => {
	if (!note.is_todo) return '';
	return note.todo_completed ? '☑ ' : '☐ ';
};

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			container: {
				backgroundColor: theme.backgroundColor,
				padding: theme.margin,
				flex: 1,
			},
			heading: {
				fontSize: theme.fontSize * 1.2,
				fontWeight: 'bold',
				color: theme.color,
				marginBottom: theme.marginBottom,
			},
			description: {
				fontSize: theme.fontSize,
				color: theme.color,
				marginBottom: theme.marginBottom * 1.5,
			},
			noteName: {
				fontWeight: 'bold',
			},
			dropdownLabel: {
				fontSize: theme.fontSize * 0.9,
				color: theme.colorFaded,
				marginBottom: 8,
			},
			listContainer: {
				borderWidth: 1,
				borderColor: theme.dividerColor,
				borderRadius: 4,
				flex: 1,
				marginBottom: theme.marginBottom,
			},
			listItem: {
				paddingVertical: 12,
				paddingHorizontal: 16,
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
			},
			listItemLast: {
				borderBottomWidth: 0,
			},
			listItemSelected: {
				backgroundColor: theme.selectedColor,
			},
			listItemDisabled: {
				opacity: 0.4,
			},
			listItemText: {
				fontSize: theme.fontSize,
				color: theme.color,
			},
			buttonContainer: {
				flexDirection: 'row',
				justifyContent: 'flex-end',
				marginTop: theme.marginTop,
				gap: theme.margin,
			},
		});
	}, [themeId]);
};

const ChangeNotePositionModal: React.FC<Props> = (props) => {
	const { visible, selectedNote, notes, onClose, onConfirm, themeId, uncompletedTodosOnTop } = props;
	const styles = useStyles(themeId);
	const theme = themeStyle(themeId);

	const [selectedTargetValue, setSelectedTargetValue] = useState<string | null>(MOVE_TO_TOP_VALUE);

	// Calculate valid move positions based on uncompletedTodosOnTop setting
	const listItems = useMemo(() => {
		if (!selectedNote) {
			return [];
		}

		const selectedIsUncompleted = isUncompletedTodo(selectedNote);

		// Find the boundary between uncompleted todos and completed/non-todos
		let lastUncompletedTodoIndex = -1;
		let firstCompletedOrNonTodoIndex = notes.length;

		if (uncompletedTodosOnTop) {
			for (let i = 0; i < notes.length; i++) {
				if (isUncompletedTodo(notes[i])) {
					lastUncompletedTodoIndex = i;
				}
			}
			firstCompletedOrNonTodoIndex = lastUncompletedTodoIndex + 1;
		}

		// Find the current index of the selected note
		const selectedNoteCurrentIndex = notes.findIndex(n => n.id === selectedNote.id);

		// Determine if MOVE TO TOP is valid
		// Disabled if:
		// 1. The note is already at the very top of the list (index 0)
		// 2. OR if moving to top would violate sectioning rules:
		//    - uncompletedTodosOnTop is enabled
		//    - AND the note is not an uncompleted todo
		//    - AND there are actually uncompleted todos at the top (firstCompletedOrNonTodoIndex > 0)
		const isAlreadyAtTop = selectedNoteCurrentIndex === 0;
		const cannotMoveAboveUncompletedTodos = uncompletedTodosOnTop && !selectedIsUncompleted && firstCompletedOrNonTodoIndex > 0;
		const moveToTopDisabled = isAlreadyAtTop || cannotMoveAboveUncompletedTodos;

		const items = [
			{
				id: MOVE_TO_TOP_VALUE,
				title: _('[MOVE TO TOP]'),
				isDisabled: moveToTopDisabled,
				targetIndex: 0,
			},
			...notes.map((note, index) => {
				// Disable if:
				// 1. It's the selected note itself
				// 2. It's the note directly above the selected note (moving below it = same position)
				// 3. Moving after this note would put the selected note outside its valid range
				const isSelectedNote = note.id === selectedNote.id;
				const isNoteAboveSelected = index === selectedNoteCurrentIndex - 1;
				const isOutOfRange = uncompletedTodosOnTop && (
					(selectedIsUncompleted && index > lastUncompletedTodoIndex) ||
					(!selectedIsUncompleted && index < firstCompletedOrNonTodoIndex - 1)
				);

				return {
					id: note.id,
					title: getTodoPrefix(note) + Note.displayTitle(note),
					isDisabled: isSelectedNote || isNoteAboveSelected || isOutOfRange,
					targetIndex: index + 1,
				};
			}),
		];

		return items;
	}, [selectedNote, notes, uncompletedTodosOnTop]);

	// Reset selection when modal opens - select first valid option
	React.useEffect(() => {
		if (visible) {
			const firstValidItem = listItems.find(item => !item.isDisabled);
			setSelectedTargetValue(firstValidItem ? firstValidItem.id : null);
		}
	}, [visible, listItems]);

	const handleConfirm = useCallback(() => {
		if (!selectedTargetValue) return;
		const selectedItem = listItems.find(item => item.id === selectedTargetValue);
		if (selectedItem && !selectedItem.isDisabled) {
			onConfirm(selectedItem.targetIndex);
		}
	}, [selectedTargetValue, listItems, onConfirm]);

	if (!selectedNote) return null;

	const noteTitle = Note.displayTitle(selectedNote);
	const truncatedTitle = truncateTitle(noteTitle, MAX_NOTE_TITLE_LENGTH);
	const hasValidTarget = !!selectedTargetValue && listItems.some(item => item.id === selectedTargetValue && !item.isDisabled);

	return (
		<Modal
			visible={visible}
			onClose={onClose}
			backgroundColor={theme.backgroundColorTransparent2}
			containerStyle={styles.container}
		>
			<Text style={styles.heading}>{_('Change note position')}</Text>
			<Text style={styles.description}>
				{_('Move note "%s" below the selected note, or move it to the top, if allowed', truncatedTitle)}
			</Text>

			<Text style={styles.dropdownLabel}>{_('Select target position:')}</Text>

			<View
				style={styles.listContainer}
				accessibilityRole="radiogroup"
				accessibilityLabel={_('Select target position')}
			>
				<ScrollView>
					{listItems.map((item, index) => {
						const isSelected = selectedTargetValue === item.id;
						const isLast = index === listItems.length - 1;

						const accessibilityLabel =
							item.id === MOVE_TO_TOP_VALUE
								? _('Move to top')
								: _('Move below %s', item.title);

						return (
							<Pressable
								key={item.id}
								style={[
									styles.listItem,
									isLast && styles.listItemLast,
									isSelected && styles.listItemSelected,
									item.isDisabled && styles.listItemDisabled,
								]}
								onPress={() => {
									if (!item.isDisabled) {
										setSelectedTargetValue(item.id);
									}
								}}
								disabled={item.isDisabled}
								importantForAccessibility={'yes'}
								accessibilityRole="radio"
								accessibilityLabel={accessibilityLabel}
								accessibilityHint={item.isDisabled ? _('This position is not valid') : undefined}
								accessibilityState={{ checked: isSelected, disabled: item.isDisabled }}
							>
								<Text
									style={styles.listItemText}
									numberOfLines={1}
									ellipsizeMode="tail"
								>
									{item.title}
								</Text>
							</Pressable>
						);
					})}
				</ScrollView>
			</View>

			<View style={styles.buttonContainer}>
				<Button onPress={onClose}>{_('Cancel')}</Button>
				<PrimaryButton onPress={handleConfirm} disabled={!hasValidTarget}>
					{_('Apply')}
				</PrimaryButton>
			</View>
		</Modal>
	);
};

export default ChangeNotePositionModal;
