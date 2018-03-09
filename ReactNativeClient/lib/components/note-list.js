const React = require("react");
const Component = React.Component;
const { connect } = require("react-redux");
const { ListView, Text, TouchableHighlight, Switch, View, StyleSheet } = require("react-native");
const { Log } = require("lib/log.js");
const { _ } = require("lib/locale.js");
const { Checkbox } = require("lib/components/checkbox.js");
const { NoteItem } = require("lib/components/note-item.js");
const { reg } = require("lib/registry.js");
const Note = require("lib/models/Note.js");
const Setting = require("lib/models/Setting.js");
const { time } = require("lib/time-utils.js");
const { themeStyle } = require("lib/components/global-style.js");

class NoteListComponent extends Component {
	constructor() {
		super();
		const ds = new ListView.DataSource({
			rowHasChanged: (r1, r2) => {
				return r1 !== r2;
			},
		});
		this.state = {
			dataSource: ds,
			items: [],
			selectedItemIds: [],
		};
		this.rootRef_ = null;
		this.styles_ = {};
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
			},
		};

		this.styles_[themeId] = StyleSheet.create(styles);
		return this.styles_[themeId];
	}

	filterNotes(notes) {
		const todoFilter = "all"; //Setting.value('todoFilter');
		if (todoFilter == "all") return notes;

		const now = time.unixMs();
		const maxInterval = 1000 * 60 * 60 * 24;
		const notRecentTime = now - maxInterval;

		let output = [];
		for (let i = 0; i < notes.length; i++) {
			const note = notes[i];
			if (note.is_todo) {
				if (todoFilter == "recent" && note.user_updated_time < notRecentTime && !!note.todo_completed) continue;
				if (todoFilter == "nonCompleted" && !!note.todo_completed) continue;
			}
			output.push(note);
		}
		return output;
	}

	componentWillMount() {
		const newDataSource = this.state.dataSource.cloneWithRows(this.filterNotes(this.props.items));
		this.setState({ dataSource: newDataSource });
	}

	componentWillReceiveProps(newProps) {
		// https://stackoverflow.com/questions/38186114/react-native-redux-and-listview
		this.setState({
			dataSource: this.state.dataSource.cloneWithRows(this.filterNotes(newProps.items)),
		});

		// Make sure scroll position is reset when switching from one folder to another or to a tag list.
		if (this.rootRef_ && newProps.notesSource != this.props.notesSource) {
			this.rootRef_.scrollTo({ x: 0, y: 0, animated: false });
		}
	}

	render() {
		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		if (this.state.dataSource.getRowCount()) {
			return (
				<ListView
					ref={ref => (this.rootRef_ = ref)}
					dataSource={this.state.dataSource}
					renderRow={note => {
						return <NoteItem note={note} />;
					}}
					enableEmptySections={true}
				/>
			);
		} else {
			const noItemMessage = _("There are currently no notes. Create one by clicking on the (+) button.");
			return <Text style={this.styles().noItemMessage}>{noItemMessage}</Text>;
		}
	}
}

const NoteList = connect(state => {
	return {
		items: state.notes,
		notesSource: state.notesSource,
		theme: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
	};
})(NoteListComponent);

module.exports = { NoteList };
