const React = require('react');
const Component = React.Component;
const { connect } = require('react-redux');
const { FlatList, Text, StyleSheet, Button, View } = require('react-native');
const { _ } = require('lib/locale.js');
const { NoteItem } = require('lib/components/note-item.js');
const { time } = require('lib/time-utils.js');
const { themeStyle } = require('lib/components/global-style.js');

class NoteListComponent extends Component {
	constructor() {
		super();

		this.state = {
			items: [],
			selectedItemIds: [],
		};
		this.rootRef_ = null;
		this.styles_ = {};

		this.createNotebookButton_click = this.createNotebookButton_click.bind(this);
	}

	styles() {
		const themeId = this.props.theme;
		const theme = themeStyle(themeId);

		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		let styles = {
			noItemMessage: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.marginTop,
				paddingBottom: theme.marginBottom,
				fontSize: theme.fontSize,
				color: theme.color,
				textAlign: 'center',
			},
			noNotebookView: {

			},
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	createNotebookButton_click() {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Folder',
			folderId: null,
		});
	}

	filterNotes(notes) {
		const todoFilter = 'all'; // Setting.value('todoFilter');
		if (todoFilter == 'all') return notes;

		const now = time.unixMs();
		const maxInterval = 1000 * 60 * 60 * 24;
		const notRecentTime = now - maxInterval;

		let output = [];
		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];
			if (note.is_todo) {
				if (todoFilter == 'recent' && note.user_updated_time < notRecentTime && !!note.todo_completed) continue;
				if (todoFilter == 'nonCompleted' && !!note.todo_completed) continue;
			}
			output.push(note);
		}
		return output;
	}

	UNSAFE_componentWillReceiveProps(newProps) {
		// Make sure scroll position is reset when switching from one folder to another or to a tag list.
		if (this.rootRef_ && newProps.notesSource != this.props.notesSource) {
			this.rootRef_.scrollToOffset({ offset: 0, animated: false });
		}
	}

	render() {
		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		if (this.props.items.length) {
			return <FlatList
				ref={ref => (this.rootRef_ = ref)}
				data={this.props.items}
				renderItem={({ item }) => <NoteItem note={item} />}
				keyExtractor={item => item.id}
			/>;
		} else {
			if (!this.props.folders.length) {
				const noItemMessage = _('You currently have no notebooks.');
				return (
					<View style={this.styles().noNotebookView}>
						<Text style={this.styles().noItemMessage}>{noItemMessage}</Text>
						<Button title={_('Create a notebook')} onPress={this.createNotebookButton_click} />
					</View>
				);
			} else {
				const noItemMessage = _('There are currently no notes. Create one by clicking on the (+) button.');
				return <Text style={this.styles().noItemMessage}>{noItemMessage}</Text>;
			}
		}
	}
}

const NoteList = connect(state => {
	return {
		items: state.notes,
		folders: state.folders,
		notesSource: state.notesSource,
		theme: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
	};
})(NoteListComponent);

module.exports = { NoteList };
