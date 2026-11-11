import * as React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { connect } from 'react-redux';
import { Text, StyleSheet, View, ViewStyle, AccessibilityInfo, Pressable } from 'react-native';
import Note from '@joplin/lib/models/Note';
import { themeStyle } from './global-style';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../utils/types';
import { Dispatch } from 'redux';
import { NoteEntity } from '@joplin/lib/services/database/types';
import useOnLongPressProps from '../utils/hooks/useOnLongPressProps';
import isNoteLockEnabled from '@joplin/lib/services/noteLock/isNoteLockEnabled';
import Icon from './Icon';
import isSyncDisabledConflict from '@joplin/lib/services/noteList/isSyncDisabledConflict';
import getNotePreviewText from '../utils/getNotePreviewText';

interface Props {
	dispatch: Dispatch;
	themeId: number;
	note: NoteEntity;
	width: number;
	noteSelectionEnabled: boolean;
	selectedNoteIds: string[];
}

const previewLineCount = 6;

const useStyles = (themeId: number, width: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		const card: ViewStyle = {
			width,
			minHeight: 110,
			maxHeight: 190,
			borderWidth: 1,
			borderColor: theme.dividerColor,
			borderRadius: 8,
			backgroundColor: theme.backgroundColor,
			padding: 10,
			overflow: 'hidden',
		};

		return StyleSheet.create({
			card,
			cardSelected: {
				...card,
				backgroundColor: theme.selectedColor,
				borderColor: theme.color,
			},
			titleRow: {
				flexDirection: 'row',
				alignItems: 'center',
			},
			title: {
				flexShrink: 1,
				color: theme.color,
				fontSize: theme.fontSize,
				fontWeight: 'bold',
			},
			icon: {
				color: theme.colorFaded,
				fontSize: theme.fontSize,
				marginRight: 6,
			},
			preview: {
				marginTop: 6,
				color: theme.colorFaded,
				fontSize: theme.fontSizeSmaller,
			},
			completed: {
				opacity: 0.4,
			},
		});
	}, [themeId, width]);
};

const NoteGridCardComponent: React.FC<Props> = memo(props => {
	const styles = useStyles(props.themeId, props.width);
	const suppressPressUntilRef = useRef(0);
	const [preview, setPreview] = useState('');

	const note = props.note ?? {};
	const noteId = note.id;
	const isEncrypted = !!note.encryption_applied;

	// The note list only loads note metadata, so the body is loaded lazily, only for the cards
	// that are actually rendered (the grid is virtualized).
	useEffect(() => {
		let cancelled = false;
		setPreview('');
		if (!noteId || isEncrypted) return () => {};
		void (async () => {
			const withBody = await Note.load(noteId, { fields: ['body'] });
			if (!cancelled && withBody) setPreview(getNotePreviewText(withBody.body));
		})();
		return () => { cancelled = true; };
	}, [noteId, note.updated_time, isEncrypted]);

	const onPress = useCallback(() => {
		if (Date.now() < suppressPressUntilRef.current) return;
		if (!props.note) return;
		if (props.note.encryption_applied) return;

		if (props.noteSelectionEnabled) {
			props.dispatch({ type: 'NOTE_SELECTION_TOGGLE', id: props.note.id });
		} else {
			props.dispatch({ type: 'NAV_GO', routeName: 'Note', noteId: props.note.id });
		}
	}, [props.note, props.noteSelectionEnabled, props.dispatch]);

	const onLongPress = useCallback(() => {
		const now = Date.now();
		if (now < suppressPressUntilRef.current) return;
		suppressPressUntilRef.current = now + 500;

		if (!props.note) return;

		if (!props.noteSelectionEnabled) {
			AccessibilityInfo.announceForAccessibility(_('Entering selection mode'));
		}

		props.dispatch({
			type: props.noteSelectionEnabled ? 'NOTE_SELECTION_TOGGLE' : 'NOTE_SELECTION_START',
			id: props.note.id,
		});
	}, [props.dispatch, props.note, props.noteSelectionEnabled]);

	const isTodo = !!Number(note.is_todo);
	const todoCompleted = !!Number(note.todo_completed);
	const isSelected = props.noteSelectionEnabled && props.selectedNoteIds.includes(note.id);
	const showSyncDisabledIcon = isSyncDisabledConflict(note);
	const showLockIcon = isNoteLockEnabled() && !!note.is_locked;
	const noteTitle = Note.displayTitle(note);

	const selectDeselectLabel = isSelected ? _('Deselect') : _('Select');
	const onLongPressProps = useOnLongPressProps({ onLongPress, actionDescription: selectDeselectLabel });

	return (
		<Pressable
			style={[isSelected ? styles.cardSelected : styles.card, isTodo && todoCompleted ? styles.completed : null]}
			accessibilityRole='button'
			accessibilityHint={props.noteSelectionEnabled ? '' : _('Opens note')}
			aria-pressed={props.noteSelectionEnabled ? isSelected : undefined}
			accessibilityState={{ selected: isSelected }}
			onPress={onPress}
			{...onLongPressProps}
		>
			<View style={styles.titleRow}>
				{isTodo && <Icon
					name={todoCompleted ? 'fas fa-check-square' : 'far fa-square'}
					style={styles.icon}
					accessibilityLabel={todoCompleted ? _('Completed to-do') : _('to-do: %s', noteTitle)}
				/>}
				{showSyncDisabledIcon && <Icon name='ionicon cloud-offline-outline' style={styles.icon} accessibilityLabel={_('Local only')} />}
				{showLockIcon && <Icon name='fas fa-lock' style={styles.icon} accessibilityLabel={_('Locked')} />}
				<Text style={styles.title} numberOfLines={2}>{noteTitle}</Text>
			</View>
			{!!preview && <Text style={styles.preview} numberOfLines={previewLineCount}>{preview}</Text>}
		</Pressable>
	);
});

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
		selectedNoteIds: state.selectedNoteIds,
	};
})(NoteGridCardComponent);
