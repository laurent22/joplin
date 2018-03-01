const React = require('react'); const Component = React.Component;
const { connect } = require('react-redux');
const { Platform, View, Text, Button, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } = require('react-native');
const Icon = require('react-native-vector-icons/Ionicons').default;
const { Log } = require('lib/log.js');
const { BackButtonService } = require('lib/services/back-button.js');
const NavService = require('lib/services/NavService.js');
const { ReportService } = require('lib/services/report.js');
const { Menu, MenuOptions, MenuOption, MenuTrigger } = require('react-native-popup-menu');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const { FileApi } = require('lib/file-api.js');
const { FileApiDriverOneDrive } = require('lib/file-api-driver-onedrive.js');
const { reg } = require('lib/registry.js');
const { themeStyle } = require('lib/components/global-style.js');
const { ItemList } = require('lib/components/ItemList.js');
const { Dropdown } = require('lib/components/Dropdown.js');
const { time } = require('lib/time-utils');
const RNFS = require('react-native-fs');
const { dialogs } = require('lib/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;

// Rather than applying a padding to the whole bar, it is applied to each
// individual component (button, picker, etc.) so that the touchable areas
// are widder and to give more room to the picker component which has a larger
// default height.
const PADDING_V = 10;

class ScreenHeaderComponent extends Component {

	constructor() {
		super();
		this.styles_ = {};
	}

	styles() {
		const themeId = Setting.value('theme');
		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const theme = themeStyle(themeId);

		let styleObject = {
			container: {
				flexDirection: 'column',
				backgroundColor: theme.raisedBackgroundColor,
				alignItems: 'center',
				shadowColor: '#000000',
				elevation: 5,
				paddingTop: Platform.OS === 'ios' ? 15 : 0, // Extra padding for iOS because the top icons are there
			},
			divider: {
				borderBottomWidth: 1,
				borderColor: theme.dividerColor,
				backgroundColor: "#0000ff"
			},
			sideMenuButton: {
				flex: 1,
				alignItems: 'center',
				backgroundColor: theme.raisedBackgroundColor,
				paddingLeft: theme.marginLeft,
				paddingRight: 5,
				marginRight: 2,
				paddingTop: PADDING_V,
				paddingBottom: PADDING_V,
			},
			iconButton: {
				flex: 1,
				backgroundColor: theme.raisedBackgroundColor,
				paddingLeft: 15,
				paddingRight: 15,
				paddingTop: PADDING_V,
				paddingBottom: PADDING_V,
			},
			saveButton: {
				flex: 0,
				flexDirection: 'row',
				alignItems: 'center',
				padding: 10,
				borderWidth: 1,
				borderColor: theme.raisedHighlightedColor,
				borderRadius: 4,
				marginRight: 8,
			},
			saveButtonText: {
				textAlignVertical: 'center',
				color: theme.raisedHighlightedColor,
				fontWeight: 'bold',
			},
			savedButtonIcon: {
				fontSize: 20,
				color: theme.raisedHighlightedColor,
				width: 18,
				height: 18,
			},
			saveButtonIcon: {
				width: 18,
				height: 18,
			},
			contextMenuTrigger: {
				fontSize: 25,
				paddingRight: theme.marginRight,
				color: theme.raisedColor,
				fontWeight: 'bold',
			},
			contextMenu: {
				backgroundColor: theme.raisedBackgroundColor,
			},
			contextMenuItem: {
				backgroundColor: theme.backgroundColor,
			},
			contextMenuItemText: {
				flex: 1,
				textAlignVertical: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				fontSize: theme.fontSize,
			},
			titleText: {
				flex: 1,
				textAlignVertical: 'center',
				marginLeft: 0,
				color: theme.raisedHighlightedColor,
				fontWeight: 'bold',
				fontSize: theme.fontSize,
			},
			warningBox: {
				backgroundColor: "#ff9900",
				flexDirection: 'row',
				padding: theme.marginLeft,
			},
		};

		styleObject.topIcon = Object.assign({}, theme.icon);
		styleObject.topIcon.flex = 1;
		styleObject.topIcon.textAlignVertical = 'center';
		styleObject.topIcon.color = theme.raisedColor;

		styleObject.backButton = Object.assign({}, styleObject.iconButton);
		styleObject.backButton.marginRight = 1;

		styleObject.backButtonDisabled = Object.assign({}, styleObject.backButton, { opacity: theme.disabledOpacity });
		styleObject.saveButtonDisabled = Object.assign({}, styleObject.saveButton, { opacity: theme.disabledOpacity });

		this.styles_[themeId] = StyleSheet.create(styleObject);
		return this.styles_[themeId];
	}

	sideMenuButton_press() {
		this.props.dispatch({ type: 'SIDE_MENU_TOGGLE' });
	}

	async backButton_press() {
		await BackButtonService.back();
	}

	searchButton_press() {
		NavService.go('Search');
	}

	async deleteButton_press() {
		// Dialog needs to be displayed as a child of the parent component, otherwise
		// it won't be visible within the header component.
		const ok = await dialogs.confirm(this.props.parentComponent, _('Delete these notes?'));
		if (!ok) return;

		const noteIds = this.props.selectedNoteIds;
		this.props.dispatch({ type: 'NOTE_SELECTION_END' });
		await Note.batchDelete(noteIds);
	}

	menu_select(value) {
		if (typeof(value) == 'function') {
			value();
		}
	}

	log_press() {
		NavService.go('Log');
	}

	status_press() {
		NavService.go('Status');
	}

	config_press() {
		NavService.go('Config');
	}

	encryptionConfig_press() {
		NavService.go('EncryptionConfig');
	}

	warningBox_press() {
		NavService.go('EncryptionConfig');
	}

	async debugReport_press() {
		const service = new ReportService();

		const logItems = await reg.logger().lastEntries(null);
		const logItemRows = [
			['Date','Level','Message']
		];
		for (let i = 0; i < logItems.length; i++) {
			const item = logItems[i];
			logItemRows.push([
				time.formatMsToLocal(item.timestamp, 'MM-DDTHH:mm:ss'),
				item.level,
				item.message
			]);
		}
		const logItemCsv = service.csvCreate(logItemRows);

		const itemListCsv = await service.basicItemList({ format: 'csv' });
		const filePath = RNFS.ExternalDirectoryPath + '/syncReport-' + (new Date()).getTime() + '.txt';

		const finalText = [logItemCsv, itemListCsv].join("\n================================================================================\n");

		await RNFS.writeFile(filePath, finalText);
		alert('Debug report exported to ' + filePath);
	}

	render() {

		function sideMenuButton(styles, onPress) {
			return (
				<TouchableOpacity onPress={onPress}>
					<View style={styles.sideMenuButton}>
						<Icon name='md-menu' style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function backButton(styles, onPress, disabled) {
			return (
				<TouchableOpacity onPress={onPress} disabled={disabled}>
					<View style={disabled ? styles.backButtonDisabled : styles.backButton}>
						<Icon name='md-arrow-back' style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function saveButton(styles, onPress, disabled, show) {
			if (!show) return null;

			const icon = disabled ? <Icon name='md-checkmark' style={styles.savedButtonIcon} /> : <Image style={styles.saveButtonIcon} source={require('./SaveIcon.png')} />;

			return (
				<TouchableOpacity onPress={onPress} disabled={disabled} style={{ padding:0 }}>
					<View style={disabled ? styles.saveButtonDisabled : styles.saveButton}>
						{ icon }
					</View>
				</TouchableOpacity>
			);
		}

		function searchButton(styles, onPress) {
			return (
				<TouchableOpacity onPress={onPress}>
					<View style={styles.iconButton}>
						<Icon name='md-search' style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function deleteButton(styles, onPress) {
			return (
				<TouchableOpacity onPress={onPress}>
					<View style={styles.iconButton}>
						<Icon name='md-trash' style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function sortButton(styles, onPress) {
			return (
				<TouchableOpacity onPress={onPress}>
					<View style={styles.iconButton}>
						<Icon name='md-funnel' style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		let key = 0;
		let menuOptionComponents = [];

		if (!this.props.noteSelectionEnabled) {
			for (let i = 0; i < this.props.menuOptions.length; i++) {
				let o = this.props.menuOptions[i];

				if (o.isDivider) {
					menuOptionComponents.push(<View key={'menuOption_' + key++} style={this.styles().divider}/>);
				} else {
					menuOptionComponents.push(
						<MenuOption value={o.onPress} key={'menuOption_' + key++} style={this.styles().contextMenuItem}>
							<Text style={this.styles().contextMenuItemText}>{o.title}</Text>
						</MenuOption>);
				}
			}

			if (this.props.showAdvancedOptions) {
				if (menuOptionComponents.length) {
					menuOptionComponents.push(<View key={'menuOption_showAdvancedOptions'} style={this.styles().divider}/>);
				}

				menuOptionComponents.push(
					<MenuOption value={() => this.log_press()} key={'menuOption_log'} style={this.styles().contextMenuItem}>
						<Text style={this.styles().contextMenuItemText}>{_('Log')}</Text>
					</MenuOption>);

				menuOptionComponents.push(
					<MenuOption value={() => this.status_press()} key={'menuOption_status'} style={this.styles().contextMenuItem}>
						<Text style={this.styles().contextMenuItemText}>{_('Status')}</Text>
					</MenuOption>);

				if (Platform.OS === 'android') {
					menuOptionComponents.push(
						<MenuOption value={() => this.debugReport_press()} key={'menuOption_debugReport'} style={this.styles().contextMenuItem}>
							<Text style={this.styles().contextMenuItemText}>{_('Export Debug Report')}</Text>
						</MenuOption>);
				} 
			}

			if (menuOptionComponents.length) {
				menuOptionComponents.push(<View key={'menuOption_' + key++} style={this.styles().divider}/>);
			}

			menuOptionComponents.push(
				<MenuOption value={() => this.encryptionConfig_press()} key={'menuOption_encryptionConfig'} style={this.styles().contextMenuItem}>
					<Text style={this.styles().contextMenuItemText}>{_('Encryption Config')}</Text>
				</MenuOption>);

			menuOptionComponents.push(
				<MenuOption value={() => this.config_press()} key={'menuOption_config'} style={this.styles().contextMenuItem}>
					<Text style={this.styles().contextMenuItemText}>{_('Configuration')}</Text>
				</MenuOption>);
		} else {
			menuOptionComponents.push(
				<MenuOption value={() => this.deleteButton_press()} key={'menuOption_delete'} style={this.styles().contextMenuItem}>
					<Text style={this.styles().contextMenuItemText}>{_('Delete')}</Text>
				</MenuOption>);
		}

		const createTitleComponent = () => {
			const themeId = Setting.value('theme');
			const theme = themeStyle(themeId);
			const folderPickerOptions = this.props.folderPickerOptions;

			if (folderPickerOptions && folderPickerOptions.enabled) {

				const titlePickerItems = (mustSelect) => {
					let output = [];
					if (mustSelect) output.push({ label: _('Move to notebook...'), value: null });
					for (let i = 0; i < this.props.folders.length; i++) {
						let f = this.props.folders[i];
						output.push({ label: Folder.displayTitle(f), value: f.id });
					}
					output.sort((a, b) => {
						if (a.value === null) return -1;
						if (b.value === null) return +1;
						return a.label.toLowerCase() < b.label.toLowerCase() ? -1 : +1;
					});
					return output;
				}

				return (
					<Dropdown
						items={titlePickerItems(!!folderPickerOptions.mustSelect)}
						itemHeight={35}
						selectedValue={('selectedFolderId' in folderPickerOptions) ? folderPickerOptions.selectedFolderId : null}
						itemListStyle={{
							backgroundColor: theme.backgroundColor,
						}}
						headerStyle={{
							color: theme.raisedHighlightedColor,
							fontSize: theme.fontSize,
						}}
						itemStyle={{
							color: theme.color,
							fontSize: theme.fontSize,
						}}
						onValueChange={async (folderId, itemIndex) => {
							// If onValueChange is specified, use this as a callback, otherwise do the default
							// which is to take the selectedNoteIds from the state and move them to the
							// chosen folder.

							if (folderPickerOptions.onValueChange) {
								folderPickerOptions.onValueChange(folderId, itemIndex);
								return;
							}

							if (!folderId) return;
							const noteIds = this.props.selectedNoteIds;
							if (!noteIds.length) return;

							const folder = await Folder.load(folderId);

							const ok = noteIds.length > 1 ? await dialogs.confirm(this.props.parentComponent, _('Move %d notes to notebook "%s"?', noteIds.length, folder.title)) : true;
							if (!ok) return;

							this.props.dispatch({ type: 'NOTE_SELECTION_END' });
							for (let i = 0; i < noteIds.length; i++) {
								await Note.moveToFolder(noteIds[i], folderId);
							}
						}}
					/>
				);
			} else {
				let title = 'title' in this.props && this.props.title !== null ? this.props.title : '';
				return <Text style={this.styles().titleText}>{title}</Text>
			}
		}

		const warningComp = this.props.showMissingMasterKeyMessage ? (
			<TouchableOpacity style={this.styles().warningBox} onPress={() => this.warningBox_press()} activeOpacity={0.8}>
				<Text style={{flex:1}}>{_('Press to set the decryption password.')}</Text>
			</TouchableOpacity>
		) : null;

		const titleComp = createTitleComponent();
		const sideMenuComp = this.props.noteSelectionEnabled ? null : sideMenuButton(this.styles(), () => this.sideMenuButton_press());
		const backButtonComp = backButton(this.styles(), () => this.backButton_press(), !this.props.historyCanGoBack);
		const searchButtonComp = this.props.noteSelectionEnabled ? null : searchButton(this.styles(), () => this.searchButton_press());
		const deleteButtonComp = this.props.noteSelectionEnabled ? deleteButton(this.styles(), () => this.deleteButton_press()) : null;
		const sortButtonComp = this.props.sortButton_press ? sortButton(this.styles(), () => this.props.sortButton_press()) : null;
		const windowHeight = Dimensions.get('window').height - 50;

		const menuComp = (
			<Menu onSelect={(value) => this.menu_select(value)} style={this.styles().contextMenu}>
				<MenuTrigger style={{ paddingTop: PADDING_V, paddingBottom: PADDING_V }}>
					<Text style={this.styles().contextMenuTrigger}>  &#8942;</Text>
				</MenuTrigger>
				<MenuOptions>
					<ScrollView style={{ maxHeight: windowHeight }}>
						{ menuOptionComponents }
					</ScrollView>
				</MenuOptions>
			</Menu>
		);

		return (
			<View style={this.styles().container} >
				<View style={{flexDirection:'row', alignItems: 'center'}}>
					{ sideMenuComp }
					{ backButtonComp }
					{ saveButton(this.styles(), () => { if (this.props.onSaveButtonPress) this.props.onSaveButtonPress() }, this.props.saveButtonDisabled === true, this.props.showSaveButton === true) }
					{ titleComp }
					{ searchButtonComp }
					{ deleteButtonComp }
					{ sortButtonComp }
					{ menuComp }
				</View>
				{ warningComp }
				<DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>
			</View>
		);
	}

}

ScreenHeaderComponent.defaultProps = {
	menuOptions: [],
};

const ScreenHeader = connect(
	(state) => {
		return {
			historyCanGoBack: state.historyCanGoBack,
			locale: state.settings.locale,
			folders: state.folders,
			theme: state.settings.theme,
			showAdvancedOptions: state.settings.showAdvancedOptions,
			noteSelectionEnabled: state.noteSelectionEnabled,
			selectedNoteIds: state.selectedNoteIds,
			showMissingMasterKeyMessage: state.notLoadedMasterKeys.length && state.masterKeys.length,
		};
	}
)(ScreenHeaderComponent)

module.exports = { ScreenHeader };