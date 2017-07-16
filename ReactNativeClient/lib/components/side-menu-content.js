import { connect } from 'react-redux'
import { TouchableOpacity , Button, Text } from 'react-native';
import { Log } from 'lib/log.js';
import { Note } from 'lib/models/note.js';
import { FoldersScreenUtils } from 'lib/components/screens/folders-utils.js'
import { NotesScreenUtils } from 'lib/components/screens/notes-utils.js'
import { reg } from 'lib/registry.js';
import { _ } from 'lib/locale.js';

const React = require('react');
const {
	Dimensions,
	StyleSheet,
	ScrollView,
	View,
	Image,
} = require('react-native');
const { Component } = React;

const styles = StyleSheet.create({
	menu: {
		flex: 1,
		backgroundColor: 'white',
		padding: 20,
	},
	name: {
		position: 'absolute',
		left: 70,
		top: 20,
	},
	item: {
		fontSize: 14,
		fontWeight: '300',
		paddingTop: 5,
	},
	folderButton: {
		flex: 1,
		backgroundColor: "#0482E3",
		paddingLeft: 20,
		paddingRight: 20,
		paddingTop: 14,
		paddingBottom: 14,
		marginBottom: 5,
	},
	folderButtonText: {
		color: "#ffffff",
		fontWeight: 'bold',
	},
	button: {
		flex: 1,
		textAlign: 'left',
	}
});

class SideMenuContentComponent extends Component {

	constructor() {
		super();
		this.state = { syncReportText: '' };
	}

	folder_press(folder) {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		NotesScreenUtils.openNoteList(folder.id);
	}

	async synchronizer_progress(report) {
		const sync = await reg.synchronizer();
		let lines = sync.reportToLines(report);
		this.setState({ syncReportText: lines.join("\n") });
	}

	synchronizer_complete() {
		FoldersScreenUtils.refreshFolders();
	}

	async componentWillMount() {
		reg.dispatcher().on('synchronizer_progress', this.synchronizer_progress.bind(this));
		reg.dispatcher().on('synchronizer_complete', this.synchronizer_complete.bind(this));
	}

	componentWillUnmount() {
		reg.dispatcher().off('synchronizer_progress', this.synchronizer_progress.bind(this));
		reg.dispatcher().off('synchronizer_complete', this.synchronizer_complete.bind(this));
	}

	async synchronize_press() {
		if (reg.oneDriveApi().auth()) {
			const sync = await reg.synchronizer()
			sync.start();
		} else {
			this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
			
			this.props.dispatch({
				type: 'Navigation/NAVIGATE',
				routeName: 'OneDriveLogin',
			});
		}
	}

	render() {
		let items = [];
		for (let i = 0; i < this.props.folders.length; i++) {
			let f = this.props.folders[i];
			let title = f.title ? f.title : '';

			items.push(
				<TouchableOpacity key={f.id} onPress={() => { this.folder_press(f) }}>
					<View style={styles.folderButton}>
						<Text numberOfLines={1} style={styles.folderButtonText}>{title}</Text>
					</View>
				</TouchableOpacity>
			);
		}

		if (items.length) items.push(<View style={{ height: 50, flex: -1 }} key='divider_1'></View>); // DIVIDER

		items.push(<Button title="Synchronize" onPress={() => { this.synchronize_press() }} key='synchronize' />);

		items.push(<Text key='sync_report'>{this.state.syncReportText}</Text>);

		return (
			<ScrollView scrollsToTop={false} style={styles.menu}>
				{ items }
			</ScrollView>
		);
	}
};

const SideMenuContent = connect(
	(state) => {
		return {
			folders: state.folders,
		};
	}
)(SideMenuContentComponent)

export { SideMenuContent };