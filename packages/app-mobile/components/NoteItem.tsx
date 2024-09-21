import * as React from 'react';
import { PureComponent } from 'react';
import { connect } from 'react-redux';
import { Text, TouchableOpacity, View, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import Checkbox from './Checkbox';
import Note from '@joplin/lib/models/Note';
import time from '@joplin/lib/time';
import { themeStyle } from './global-style';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../utils/types';
import { Dispatch } from 'redux';
import { NoteEntity } from '@joplin/lib/services/database/types';

interface Props {
	dispatch: Dispatch;
	themeId: number;
	note: NoteEntity;
	noteSelectionEnabled: boolean;
	selectedNoteIds: string[];
}

interface State {}

type Styles = Record<string, TextStyle|ViewStyle>;

class NoteItemComponent extends PureComponent<Props, State> {
	private styles_: Record<string, Styles> = {};
	public constructor(props: Props) {
		super(props);
	}

	private styles() {
		const theme = themeStyle(this.props.themeId);
		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const styles: Record<string, TextStyle|ViewStyle> = {
			listItem: {
				flexDirection: 'row',
				// height: 40,
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				alignItems: 'flex-start',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
				// backgroundColor: theme.backgroundColor,
			},
			listItemText: {
				flex: 1,
				color: theme.color,
				fontSize: theme.fontSize,
			},
			selectionWrapper: {
				backgroundColor: theme.backgroundColor,
			},
			checkboxStyle: {
				color: theme.color,
				paddingRight: 10,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
				paddingLeft: theme.marginLeft,
			},
			checkedOpacityStyle: {
				opacity: 0.4,
			},
			uncheckedOpacityStyle: { },
		};

		styles.listItemWithCheckbox = { ...styles.listItem };
		delete styles.listItemWithCheckbox.paddingTop;
		delete styles.listItemWithCheckbox.paddingBottom;
		delete styles.listItemWithCheckbox.paddingLeft;

		styles.listItemTextWithCheckbox = { ...styles.listItemText };
		styles.listItemTextWithCheckbox.marginTop = theme.itemMarginTop - 1;
		styles.listItemTextWithCheckbox.marginBottom = styles.listItem.paddingBottom;

		styles.selectionWrapperSelected = { ...styles.selectionWrapper };
		styles.selectionWrapperSelected.backgroundColor = theme.selectedColor;

		this.styles_[this.props.themeId] = StyleSheet.create(styles);
		return this.styles_[this.props.themeId];
	}

	private todoCheckbox_change = async (checked: boolean) => {
		if (!this.props.note) return;

		const newNote = {
			id: this.props.note.id,
			todo_completed: checked ? time.unixMs() : 0,
		};
		await Note.save(newNote);

		this.props.dispatch({ type: 'NOTE_SORT' });
	};

	private onPress = () => {
		if (!this.props.note) return;
		if (this.props.note.encryption_applied) return;

		if (this.props.noteSelectionEnabled) {
			this.props.dispatch({
				type: 'NOTE_SELECTION_TOGGLE',
				id: this.props.note.id,
			});
		} else {
			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Note',
				noteId: this.props.note.id,
			});
		}
	};

	private onLongPress = () => {
		if (!this.props.note) return;

		this.props.dispatch({
			type: this.props.noteSelectionEnabled ? 'NOTE_SELECTION_TOGGLE' : 'NOTE_SELECTION_START',
			id: this.props.note.id,
		});
	};

	public render() {
		const note = this.props.note ? this.props.note : {};
		const isTodo = !!Number(note.is_todo);
		const checkboxChecked = !!Number(note.todo_completed);

		const checkboxStyle = this.styles().checkboxStyle;
		const listItemStyle = isTodo ? this.styles().listItemWithCheckbox : this.styles().listItem;
		const listItemTextStyle = isTodo ? this.styles().listItemTextWithCheckbox : this.styles().listItemText;
		const opacityStyle = isTodo && checkboxChecked ? this.styles().checkedOpacityStyle : this.styles().uncheckedOpacityStyle;
		const isSelected = this.props.noteSelectionEnabled && this.props.selectedNoteIds.indexOf(note.id) >= 0;

		const selectionWrapperStyle = isSelected ? this.styles().selectionWrapperSelected : this.styles().selectionWrapper;

		const noteTitle = Note.displayTitle(note);

		return (
			<TouchableOpacity onPress={this.onPress} onLongPress={this.onLongPress} activeOpacity={0.5}>
				<View style={selectionWrapperStyle}>
					<View style={opacityStyle}>
						<View style={listItemStyle}>
							{isTodo ? <Checkbox
								style={checkboxStyle}
								checked={checkboxChecked}
								onChange={this.todoCheckbox_change}
								accessibilityLabel={_('to-do: %s', noteTitle)}
							/> : null }
							<Text style={listItemTextStyle}>{noteTitle}</Text>
						</View>
					</View>
				</View>
			</TouchableOpacity>
		);
	}
}

export default connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
		selectedNoteIds: state.selectedNoteIds,
	};
})(NoteItemComponent);

