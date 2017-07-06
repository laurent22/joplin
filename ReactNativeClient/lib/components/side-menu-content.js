import { connect } from 'react-redux'
import { Button, Text } from 'react-native';
import { Log } from 'lib/log.js';
import { Note } from 'lib/models/note.js';
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

const window = Dimensions.get('window');

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
		this.props.dispatch({
			type: 'SIDE_MENU_CLOSE',
		});

		NotesScreenUtils.openNoteList(folder.id);
	}

	async synchronize_press() {
		if (reg.oneDriveApi().auth()) {
			let options = {
				onProgress: (report) => {
					let line = [];
					line.push(_('Items to upload: %d/%d.', report.createRemote + report.updateRemote, report.remotesToUpdate));
					line.push(_('Remote items to delete: %d/%d.', report.deleteRemote, report.remotesToDelete));
					line.push(_('Items to download: %d/%d.', report.createLocal + report.updateLocal, report.localsToUdpate));
					line.push(_('Local items to delete: %d/%d.', report.deleteLocal, report.localsToDelete));
					this.setState({	syncReportText: line.join("\n") });
				},
			};

			try {
				const sync = await reg.synchronizer()
				sync.start(options);
			} catch (error) {
				Log.error(error);
			}
		} else {
			this.props.dispatch({
				type: 'Navigation/NAVIGATE',
				routeName: 'OneDriveLogin',
			});
		}
	}

	render() {
		let keyIndex = 0;
		let key = () => {
			return 'smitem_' + (keyIndex++);
		}

		let items = [];
		for (let i = 0; i < this.props.folders.length; i++) {
			let f = this.props.folders[i];
			let title = f.title ? f.title : '';
			items.push(
				<Button style={styles.button} title={title} onPress={() => { this.folder_press(f) }} key={key()} />
			);
		}

		items.push(<Text key={key()}></Text>); // DIVIDER

		items.push(<Button style={styles.button} title="Synchronize" onPress={() => { this.synchronize_press() }} key={key()} />);

		items.push(<Text key={key()}>{this.state.syncReportText}</Text>);

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