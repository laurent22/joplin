const React = require('react'); const Component = React.Component;
const { View, StyleSheet, ScrollView, Text, TouchableOpacity } = require('react-native');
const { connect } = require('react-redux');
const { ActionButton } = require('lib/components/action-button.js');
const Folder = require('lib/models/Folder.js');
const BaseModel = require('lib/BaseModel.js');
const { ScreenHeader } = require('lib/components/screen-header.js');
const { reg } = require('lib/registry.js');
const { BaseScreenComponent } = require('lib/components/base-screen.js');
const { dialogs } = require('lib/dialogs.js');
const { globalStyle, themeStyle } = require('lib/components/global-style.js');
const { _ } = require('lib/locale.js');
const shared = require('lib/components/shared/side-menu-shared.js');

class FolderMoveScreenComponent extends BaseScreenComponent {
	
	static navigationOptions(options) {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			folder: Folder.new(),
			lastSavedFolder: null,
		};
		this.styles_ = {};
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};


		let styles = {
			menu: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
				borderTopWidth: 1,
				borderTopColor: theme.dividerColor,
			},
			button: {
				flex: 1,
				flexDirection: 'row',
				height: 36,
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
			},
			buttonText: {
				flex: 1,
				color: theme.color,
				paddingLeft: 10,
				fontSize: theme.fontSize,
			},
		};
		
		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
	}

	UNSAFE_componentWillMount() {
		Folder.load(this.props.folderId).then((folder) => {
			this.setState({
				folder: folder,
				lastSavedFolder: Object.assign({}, folder),
			});
		});
	}

	makeDivider(key) {
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: globalStyle.dividerColor }} key={key}></View>
	}

	folder_press(folderId) {
		Folder.moveToFolder(this.props.folderId, folderId).then(() => {
			this.props.dispatch({
				type: 'NAV_BACK',
			});
		}).catch((error) => {
			dialogs.error(this, error.message);
		});
	}


	folderItem(folder, selected, hasChildren, depth) {
		const theme = themeStyle(this.props.theme);

		const folderButtonStyle = {
			flex: 1,
			flexDirection: 'row',
			height: 36,
			alignItems: 'center',
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
		};
		if (selected) {
			folderButtonStyle.backgroundColor = theme.selectedColor;
			folderButtonStyle.opacity = theme.disabledOpacity;
		}
		folderButtonStyle.paddingLeft = 10 + depth * 10;

		return (
			<View key={folder.id} style={{ flex: 1, flexDirection: 'row' }}>
				<TouchableOpacity style={{ flex: 1 }} onPress={() => { this.folder_press(folder.id) }}>
					<View style={folderButtonStyle}>
						<Text numberOfLines={1} style={this.styles().buttonText}>{Folder.displayTitle(folder)}</Text>
					</View>
				</TouchableOpacity>
			</View>
		);
	}


	render() {
		const theme = themeStyle(this.props.theme);

		let items = [];

		items.push(this.makeDivider('divider_1'));

		const folderButtonStyle = {
			flex: 1,
			flexDirection: 'row',
			height: 36,
			alignItems: 'center',
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
		};
		folderButtonStyle.paddingLeft = 0;

		// add root folder
		items.push(
			<View key={'root'} style={{ flex: 1, flexDirection: 'row' }}>
				<TouchableOpacity style={{ flex: 1 }} onPress={() => { this.folder_press('') }}>
					<View style={folderButtonStyle}>
						<Text numberOfLines={1} style={this.styles().buttonText}>{'<Root>'}</Text>
					</View>
				</TouchableOpacity>
			</View>
		);

		// add all folders
		if (this.props.folders.length) {
			const folderItems = shared.renderFolders(this.props, this.folderItem.bind(this));
			items = items.concat(folderItems);
		}

		items.push(this.makeDivider('divider_2'));

		let style = {
			flex: 1,
			borderRightWidth: 1,
			borderRightColor: globalStyle.dividerColor,
			backgroundColor: theme.backgroundColor,
		};

		return (
			<View style={this.rootStyle(this.props.theme).root}>
				<ScreenHeader
					title={_('Move notebook') + ' \'' + Folder.displayTitle(this.state.folder) + '\''}
					showSaveButton={false}
				/>

				<View style={style}>
					<View style={{flex:1, opacity: this.props.opacity}}>
						<ScrollView scrollsToTop={false} style={this.styles().menu}>
							{ items }
						</ScrollView>
					</View>
				</View>

				<dialogs.DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>
			</View>
		);
	}

}

const FolderMoveScreen = connect(
	(state) => {
		return {
			folderId: state.selectedFolderId,
			theme: state.settings.theme,
			folders: state.folders,
			selectedFolderId: state.selectedFolderId,
			notesParentType: state.notesParentType,
		};
	}
)(FolderMoveScreenComponent)

module.exports = { FolderMoveScreen };
