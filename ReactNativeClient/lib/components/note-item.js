const React = require('react'); const Component = React.Component;
const { connect } = require('react-redux');
const { ListView, Text, TouchableHighlight, View, StyleSheet } = require('react-native');
const { Log } = require('lib/log.js');
const { _ } = require('lib/locale.js');
const { Checkbox } = require('lib/components/checkbox.js');
const { reg } = require('lib/registry.js');
const { Note } = require('lib/models/note.js');
const { time } = require('lib/time-utils.js');
const { globalStyle, themeStyle } = require('lib/components/global-style.js');

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

		let styles = {
			listItem: {
				flexDirection: 'row',
				//height: 40,
				borderBottomWidth: 1,
				borderBottomColor: theme.dividerColor,
				alignItems: 'flex-start',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
				backgroundColor: theme.backgroundColor,
			},
			listItemText: {
				flex: 1,
				color: theme.color,
				fontSize: theme.fontSize,
			},
		};

		styles.listItemWithCheckbox = Object.assign({}, styles.listItem);
		delete styles.listItemWithCheckbox.paddingTop;
		delete styles.listItemWithCheckbox.paddingBottom;
		delete styles.listItemWithCheckbox.paddingLeft;

		styles.listItemTextWithCheckbox = Object.assign({}, styles.listItemText);
		styles.listItemTextWithCheckbox.marginTop = styles.listItem.paddingTop - 1;
		styles.listItemTextWithCheckbox.marginBottom = styles.listItem.paddingBottom;

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
	}

	async todoCheckbox_change(checked) {	
		if (!this.props.note) return;

		const newNote = {
			id: this.props.note.id,
			todo_completed: checked ? time.unixMs() : 0,
		}
		await Note.save(newNote);
	}

	onPress() {
		if (!this.props.note) return;

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Note',
			noteId: this.props.note.id,
		});
	}

	render() {
		const note = this.props.note ? this.props.note : {};
		const isTodo = !!Number(note.is_todo);
		const onPress = this.props.onPress;
		const onCheckboxChange = this.props.onCheckboxChange;
		const theme = themeStyle(this.props.theme);

		// IOS: display: none crashes the app
		let checkboxStyle = !isTodo ? { display: 'none' } : { color: theme.color };

		if (isTodo) {
			checkboxStyle.paddingRight = 10;
			checkboxStyle.paddingTop = theme.itemMarginTop;
			checkboxStyle.paddingBottom = theme.itemMarginBottom;
			checkboxStyle.paddingLeft = theme.marginLeft;
		}

		const checkboxChecked = !!Number(note.todo_completed);

		const listItemStyle = isTodo ? this.styles().listItemWithCheckbox : this.styles().listItem;
		const listItemTextStyle = isTodo ? this.styles().listItemTextWithCheckbox : this.styles().listItemText;
		const rootStyle = isTodo && checkboxChecked ? {opacity: 0.4} : {};

		return (
			<TouchableHighlight onPress={() => this.onPress()} underlayColor="#0066FF" style={rootStyle}>
				<View style={ listItemStyle }>
					<Checkbox
						style={checkboxStyle}
						checked={checkboxChecked}
						onChange={(checked) => this.todoCheckbox_change(checked)}
					/>
					<Text style={listItemTextStyle}>{note.title}</Text>
				</View>
			</TouchableHighlight>
		);
	}

}

const NoteItem = connect(
	(state) => {
		return {
			theme: state.settings.theme,
		};
	}
)(NoteItemComponent)

module.exports = { NoteItem };