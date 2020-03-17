const React = require('react');
const Component = React.Component;
const { connect } = require('react-redux');
const { Text, TouchableOpacity, View, StyleSheet } = require('react-native');
const { Checkbox } = require('lib/components/checkbox.js');
const Note = require('lib/models/Note.js');
const { time } = require('lib/time-utils.js');
const { themeStyle } = require('lib/components/global-style.js');

class NoteItemComponent extends Component {
	constructor() {
		super();
		this.styles_ = {};
	}

	noteItem_press(noteId) {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: noteId,
		});
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};

		const styles = {
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
		};

		styles.listItemWithCheckbox = Object.assign({}, styles.listItem);
		delete styles.listItemWithCheckbox.paddingTop;
		delete styles.listItemWithCheckbox.paddingBottom;
		delete styles.listItemWithCheckbox.paddingLeft;

		styles.listItemTextWithCheckbox = Object.assign({}, styles.listItemText);
		styles.listItemTextWithCheckbox.marginTop = styles.listItem.paddingTop - 1;
		styles.listItemTextWithCheckbox.marginBottom = styles.listItem.paddingBottom;

		styles.selectionWrapperSelected = Object.assign({}, styles.selectionWrapper);
		styles.selectionWrapperSelected.backgroundColor = theme.selectedColor;

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
	}

	async todoCheckbox_change(checked) {
		if (!this.props.note) return;

		const newNote = {
			id: this.props.note.id,
			todo_completed: checked ? time.unixMs() : 0,
		};
		await Note.save(newNote);
	}

	onPress() {
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
	}

	onLongPress() {
		if (!this.props.note) return;

		this.props.dispatch({
			type: this.props.noteSelectionEnabled ? 'NOTE_SELECTION_TOGGLE' : 'NOTE_SELECTION_START',
			id: this.props.note.id,
		});
	}

	render() {
		const note = this.props.note ? this.props.note : {};
		const isTodo = !!Number(note.is_todo);

		const theme = themeStyle(this.props.theme);

		// IOS: display: none crashes the app
		const checkboxStyle = !isTodo ? { display: 'none' } : { color: theme.color };

		if (isTodo) {
			checkboxStyle.paddingRight = 10;
			checkboxStyle.paddingTop = theme.itemMarginTop;
			checkboxStyle.paddingBottom = theme.itemMarginBottom;
			checkboxStyle.paddingLeft = theme.marginLeft;
		}

		const checkboxChecked = !!Number(note.todo_completed);

		const listItemStyle = isTodo ? this.styles().listItemWithCheckbox : this.styles().listItem;
		const listItemTextStyle = isTodo ? this.styles().listItemTextWithCheckbox : this.styles().listItemText;
		const opacityStyle = isTodo && checkboxChecked ? { opacity: 0.4 } : {};
		const isSelected = this.props.noteSelectionEnabled && this.props.selectedNoteIds.indexOf(note.id) >= 0;

		const selectionWrapperStyle = isSelected ? this.styles().selectionWrapperSelected : this.styles().selectionWrapper;

		return (
			<TouchableOpacity onPress={() => this.onPress()} onLongPress={() => this.onLongPress()} activeOpacity={0.5}>
				<View style={selectionWrapperStyle}>
					<View style={opacityStyle}>
						<View style={listItemStyle}>
							<Checkbox style={checkboxStyle} checked={checkboxChecked} onChange={checked => this.todoCheckbox_change(checked)} />
							<Text style={listItemTextStyle}>{Note.displayTitle(note)}</Text>
						</View>
					</View>
				</View>
			</TouchableOpacity>
		);
	}
}

const NoteItem = connect(state => {
	return {
		theme: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
		selectedNoteIds: state.selectedNoteIds,
	};
})(NoteItemComponent);

module.exports = { NoteItem };
