const React = require('react'); const Component = React.Component;
const { View, Button } = require('react-native');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { Log } = require('lib/log.js');
const { NoteList } = require('lib/components/note-list.js');
const Folder = require('lib/models/Folder.js');
const Tag = require('lib/models/Tag.js');
const Note = require('lib/models/Note.js');
const Setting = require('lib/models/Setting.js');
const { themeStyle } = require('lib/components/global-style.js');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { MenuOption, Text } = require('react-native-popup-menu');
const { _ } = require('lib/locale.js');
const { ActionButton } = require('lib/components/action-button.js');
const { dialogs } = require('lib/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;
const { BaseScreenComponent } = require('lib/components/base-screen.js');

class NotesScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	async componentDidMount() {
		await this.refreshNotes();
	}

	async componentWillReceiveProps(newProps) {
		if (newProps.notesOrder !== this.props.notesOrder ||
		    newProps.selectedFolderId != this.props.selectedFolderId ||
		    newProps.selectedTagId != this.props.selectedTagId ||
		    newProps.notesParentType != this.props.notesParentType) {
			await this.refreshNotes(newProps);
		}
	}

	async refreshNotes(props = null) {
		if (props === null) props = this.props;

		let options = {
			order: props.notesOrder,
			uncompletedTodosOnTop: props.uncompletedTodosOnTop,
		};

		const parent = this.parentItem(props);
		if (!parent) return;

		const source = JSON.stringify({
			options: options,
			parentId: parent.id,
		});

		if (source == props.notesSource) return;

		let notes = [];
		if (props.notesParentType == 'Folder') {
			notes = await Note.previews(props.selectedFolderId, options);
		} else {
			notes = await Tag.notes(props.selectedTagId); // TODO: should also return previews
		}

		this.props.dispatch({
			type: 'NOTE_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});
	}

	deleteFolder_onPress(folderId) {
		dialogs.confirm(this, _('Delete notebook? All notes within this notebook will also be deleted.')).then((ok) => {
			if (!ok) return;

			Folder.delete(folderId).then(() => {
				this.props.dispatch({
					type: 'NAV_GO',
					routeName: 'Welcome',
				});
			}).catch((error) => {
				alert(error.message);
			});
		});
	}

	editFolder_onPress(folderId) {
		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Folder',
			folderId: folderId,
		});
	}

	menuOptions() {
		if (this.props.notesParentType == 'Folder') {
			if (this.props.selectedFolderId == Folder.conflictFolderId()) return [];

			const folder = this.parentItem();
			if (!folder) return [];

			let output = [];
			if (!folder.encryption_applied) output.push({ title: _('Edit notebook'), onPress: () => { this.editFolder_onPress(this.props.selectedFolderId); } });
			output.push({ title: _('Delete notebook'), onPress: () => { this.deleteFolder_onPress(this.props.selectedFolderId); } });

			return output;
		} else {
			return []; // For tags - TODO
		}
	}

	parentItem(props = null) {
		if (!props) props = this.props;

		let output = null;
		if (props.notesParentType == 'Folder') {
			output = Folder.byId(props.folders, props.selectedFolderId);
		} else if (props.notesParentType == 'Tag') {
			output = Tag.byId(props.tags, props.selectedTagId);
		} else {
			return null;
			throw new Error('Invalid parent type: ' + props.notesParentType);
		}
		return output;
	}

	render() {
		const parent = this.parentItem();
		const theme = themeStyle(this.props.theme);

		let rootStyle = {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		}

		if (!this.props.visible) {
			rootStyle.flex = 0.001; // This is a bit of a hack but it seems to work fine - it makes the component invisible but without unmounting it
		}

		if (!parent) {
			return (
				<View style={rootStyle}>
					<ScreenHeader title={title} menuOptions={this.menuOptions()} />
				</View>
			)
		}

		let title = parent ? parent.title : null;
		const addFolderNoteButtons = this.props.selectedFolderId && this.props.selectedFolderId != Folder.conflictFolderId();
		const thisComp = this;
		const actionButtonComp = this.props.noteSelectionEnabled ? null : <ActionButton addFolderNoteButtons={addFolderNoteButtons} parentFolderId={this.props.selectedFolderId}></ActionButton>

		return (
			<View style={rootStyle}>
				<ScreenHeader
					title={title}
					menuOptions={this.menuOptions()}
					parentComponent={thisComp}
					folderPickerOptions={{
						enabled: this.props.noteSelectionEnabled,
						mustSelect: true,
					}}
				/>
				<NoteList style={{flex: 1}}/>
				{ actionButtonComp }
				<DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>
			</View>
		);
	}
}

const NotesScreen = connect(
	(state) => {
		return {
			folders: state.folders,
			tags: state.tags,
			selectedFolderId: state.selectedFolderId,
			selectedNoteIds: state.selectedNoteIds,
			selectedTagId: state.selectedTagId,
			notesParentType: state.notesParentType,
			notes: state.notes,
			notesOrder: state.notesOrder,
			notesSource: state.notesSource,
			uncompletedTodosOnTop: state.settings.uncompletedTodosOnTop,
			theme: state.settings.theme,
			noteSelectionEnabled: state.noteSelectionEnabled,
		};
	}
)(NotesScreenComponent)

module.exports = { NotesScreen };