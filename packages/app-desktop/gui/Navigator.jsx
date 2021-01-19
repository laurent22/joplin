const React = require('react');
const Component = React.Component;
const Setting = require('@joplin/lib/models/Setting').default;
const { connect } = require('react-redux');
const bridge = require('electron').remote.require('./bridge').default;

class NavigatorComponent extends Component {
	UNSAFE_componentWillReceiveProps(newProps) {
		if (newProps.route) {
			const screenInfo = this.props.screens[newProps.route.routeName];
			const devMarker = Setting.value('env') === 'dev' ? ' (DEV)' : '';
			const windowTitle = [];
			if (screenInfo.title) {
				windowTitle.push(screenInfo.title());
			} else if (newProps.route.routeName == 'Main' && newProps.currentFolder && newProps.currentNote) {
				const folderTitle = newProps.currentFolder.title.trim();
				let noteTitle = newProps.currentNote.title.trim();
				if (!noteTitle.length) {
					noteTitle = 'Untitled';
				}
				windowTitle.push(`${noteTitle} (${folderTitle})`);
			}
			windowTitle.push(`Joplin${devMarker}`);
			this.updateWindowTitle(windowTitle.join(' - '));
		}
	}

	updateWindowTitle(title) {
		try {
			if (bridge().window()) bridge().window().setTitle(title);
		} catch (error) {
			console.warn('updateWindowTitle', error);
		}
	}

	render() {
		if (!this.props.route) throw new Error('Route must not be null');

		const route = this.props.route;
		const screenProps = route.props ? route.props : {};
		const screenInfo = this.props.screens[route.routeName];
		const Screen = screenInfo.screen;

		const screenStyle = {
			width: this.props.style.width,
			height: this.props.style.height,
		};

		return (
			<div style={this.props.style}>
				<Screen style={screenStyle} {...screenProps} />
			</div>
		);
	}
}

const Navigator = connect(state => {
	let currentNote = null;
	let currentFolder = null;
	if (state.selectedNoteIds.length) {
		const noteId = state.selectedNoteIds[0];
		const note = state.notes.find((_note) => _note.id == noteId);
		if (note) {
			currentNote = {
				id: noteId,
				title: note.title,
			};
		}
	}
	if (state.selectedFolderId) {
		const folder = state.folders.find((_folder) => _folder.id == state.selectedFolderId);
		if (folder) {
			currentFolder = {
				id: state.selectedFolderId,
				title: folder.title,
			};
		}
	}
	return {
		route: state.route, currentNote, currentFolder,
	};
})(NavigatorComponent);

module.exports = { Navigator };
