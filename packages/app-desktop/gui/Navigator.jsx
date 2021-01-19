const React = require('react');
const Component = React.Component;
const Setting = require('@joplin/lib/models/Setting').default;
const { connect } = require('react-redux');
const bridge = require('electron').remote.require('./bridge').default;

class NavigatorComponent extends Component {
	constructor(props) {
		super(props);
		this.prevTitle = null;
	}
	UNSAFE_componentWillReceiveProps(newProps) {
		if (newProps.route) {
			const windowTitle = [];
			const txt = this.getWindowTitle(newProps);
			if (txt) { windowTitle.push(txt); }
			const devMarker = Setting.value('env') === 'dev' ? ' (DEV)' : '';
			windowTitle.push(`Joplin${devMarker}`);
			this.updateWindowTitle(windowTitle.join(' - '));
		}
	}
	getWindowTitle(newProps) {
		let currentNote = null;
		let currentFolder = null;
		if (newProps.selectedNoteIds.length) {
			const noteId = newProps.selectedNoteIds[0];
			const note = newProps.notes.find((_note) => _note.id == noteId);
			if (note) {
				currentNote = {
					id: noteId,
					title: note.title,
				};
			}
		}
		if (newProps.selectedFolderId) {
			const folder = newProps.folders.find((_folder) => _folder.id == newProps.selectedFolderId);
			if (folder) {
				currentFolder = {
					id: newProps.selectedFolderId,
					title: folder.title,
				};
			}
		}
		const screenInfo = this.props.screens[newProps.route.routeName];
		let txt = null;
		if (screenInfo.title) {
			txt = screenInfo.title();
		} else if (newProps.route.routeName == 'Main' && currentFolder && currentNote) {
			const folderTitle = currentFolder.title.trim();
			let noteTitle = currentNote.title.trim();
			if (!noteTitle.length) {
				noteTitle = 'Untitled';
			}
			txt = `${folderTitle} > ${noteTitle}`;
		}
		return txt;
	}
	updateWindowTitle(title) {
		if (this.prevTitle != title) {
			console.log('updating title',title);
			try {
				if (bridge().window()) bridge().window().setTitle(title);
				this.prevTitle = title;
			} catch (error) {
				console.warn('updateWindowTitle', error);
			}
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
	return {
		route: state.route,
		selectedNoteIds: state.selectedNoteIds,
		selectedFolderId: state.selectedFolderId,
		folders: state.folders,
		notes: state.notes,
	};
})(NavigatorComponent);

module.exports = { Navigator };
