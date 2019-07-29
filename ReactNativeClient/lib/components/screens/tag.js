const React = require('react');

const { View } = require('react-native');
const { connect } = require('react-redux');
const { ScreenHeader } = require('lib/components/screen-header.js');
const Icon = require('react-native-vector-icons/Ionicons').default;
const Note = require('lib/models/Note.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');

let styles = {
	body: {
		flex: 1,
	},
};

class TagScreenComponent extends BaseScreenComponent {
	static navigationOptions(options) {
		return { header: null };
	}

	componentDidMount() {
		this.refreshNotes();
	}

	UNSAFE_componentWillReceiveProps(newProps) {
		if (newProps.selectedTagId !== this.props.selectedTagId) {
			this.refreshNotes(newProps);
		}
	}

	async refreshNotes(props = null) {
		if (props === null) props = this.props;

		const source = JSON.stringify({ selectedTagId: props.selectedTagId });
		if (source == props.tagNotesSource) return;

		const notes = await Tag.notes(props.selectedTagId);

		this.props.dispatch({
			type: 'NOTE_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});
	}

	render() {
		let title = tag ? tag.title : '';

		const {} = this.props.navigation;
		return (
			<View style={this.styles().screen}>
				<ScreenHeader title={title} menuOptions={this.menuOptions()} />
				<NoteList style={{ flex: 1 }} />
				<DialogBox
					ref={dialogbox => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

const TagScreen = connect(state => {
	return {
		tag: tag,
		notes: state.notes,
		notesSource: state.notesSource,
	};
})(TagScreenComponent);

module.exports = { TagScreen };
