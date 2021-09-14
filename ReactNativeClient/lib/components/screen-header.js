const React = require('react');

const { connect } = require('react-redux');
const { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions } = require('react-native');
const Icon = require('react-native-vector-icons/Ionicons').default;
const { BackButtonService } = require('lib/services/back-button.js');
const NavService = require('lib/services/NavService.js');
const { Menu, MenuOptions, MenuOption, MenuTrigger } = require('react-native-popup-menu');
const { _ } = require('lib/locale.js');
const Setting = require('lib/models/Setting.js');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const { themeStyle } = require('lib/components/global-style.js');
const { Dropdown } = require('lib/components/Dropdown.js');
const { dialogs } = require('lib/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;

Icon.loadFont();

// Rather than applying a padding to the whole bar, it is applied to each
// individual component (button, picker, etc.) so that the touchable areas
// are widder and to give more room to the picker component which has a larger
// default height.
const PADDING_V = 10;

class ScreenHeaderComponent extends React.PureComponent {
	constructor() {
		super();
		this.styles_ = {};
	}

	styles() {
		const themeId = Setting.value('theme');
		if (this.styles_[themeId]) return this.styles_[themeId];
		this.styles_ = {};

		const theme = themeStyle(themeId);

		const styleObject = {
			container: {
				flexDirection: 'column',
				backgroundColor: theme.backgroundColor2,
				alignItems: 'center',
				shadowColor: '#000000',
				elevation: 5,
			},
			divider: {
				borderBottomWidth: 1,
				borderColor: theme.dividerColor,
				backgroundColor: '#0000ff',
			},
			sideMenuButton: {
				flex: 1,
				alignItems: 'center',
				backgroundColor: theme.backgroundColor2,
				paddingLeft: theme.marginLeft,
				paddingRight: 5,
				marginRight: 2,
				paddingTop: PADDING_V,
				paddingBottom: PADDING_V,
			},
			iconButton: {
				flex: 1,
				backgroundColor: theme.backgroundColor2,
				paddingLeft: 10,
				paddingRight: 10,
				paddingTop: PADDING_V,
				paddingBottom: PADDING_V,
			},
			saveButton: {
				flex: 0,
				flexDirection: 'row',
				alignItems: 'center',
				padding: 10,
				borderWidth: 1,
				borderColor: theme.colorBright2,
				borderRadius: 4,
				marginRight: 8,
			},
			saveButtonText: {
				textAlignVertical: 'center',
				color: theme.colorBright2,
				fontWeight: 'bold',
			},
			savedButtonIcon: {
				fontSize: 20,
				color: theme.colorBright2,
				width: 18,
				height: 18,
			},
			saveButtonIcon: {
				width: 18,
				height: 18,
			},
			contextMenuTrigger: {
				fontSize: 30,
				paddingLeft: 10,
				paddingRight: theme.marginRight,
				color: theme.color2,
				fontWeight: 'bold',
			},
			contextMenu: {
				backgroundColor: theme.backgroundColor2,
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
				marginLeft: 10,
				color: theme.colorBright2,
				fontWeight: 'bold',
				fontSize: theme.fontSize,
				paddingTop: 15,
				paddingBottom: 15,
			},
			warningBox: {
				backgroundColor: '#ff9900',
				flexDirection: 'row',
				padding: theme.marginLeft,
			},
		};

		styleObject.topIcon = Object.assign({}, theme.icon);
		styleObject.topIcon.flex = 1;
		styleObject.topIcon.textAlignVertical = 'center';
		styleObject.topIcon.color = theme.colorBright2;

		styleObject.backButton = Object.assign({}, styleObject.iconButton);
		styleObject.backButton.marginRight = 1;

		styleObject.backButtonDisabled = Object.assign({}, styleObject.backButton, { opacity: theme.disabledOpacity });
		styleObject.saveButtonDisabled = Object.assign({}, styleObject.saveButton, { opacity: theme.disabledOpacity });
		styleObject.iconButtonDisabled = Object.assign({}, styleObject.iconButton, { opacity: theme.disabledOpacity });

		this.styles_[themeId] = StyleSheet.create(styleObject);
		return this.styles_[themeId];
	}

	sideMenuButton_press() {
		this.props.dispatch({ type: 'SIDE_MENU_TOGGLE' });
	}

	async backButton_press() {
		if (this.props.noteSelectionEnabled) {
			this.props.dispatch({ type: 'NOTE_SELECTION_END' });
		} else {
			await BackButtonService.back();
		}
	}

	selectAllButton_press() {
		this.props.dispatch({ type: 'NOTE_SELECT_ALL_TOGGLE' });
	}

	searchButton_press() {
		NavService.go('Search');
	}

	async duplicateButton_press() {
		const noteIds = this.props.selectedNoteIds;

		// Duplicate all selected notes. ensureUniqueTitle is set to true to use the
		// original note's name as a root for the new unique identifier.
		await Note.duplicateMultipleNotes(noteIds, { ensureUniqueTitle: true });

		this.props.dispatch({ type: 'NOTE_SELECTION_END' });
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
		if (typeof value == 'function') {
			value();
		}
	}

	log_press() {
		NavService.go('Log');
	}

	status_press() {
		NavService.go('Status');
	}

	warningBox_press(event) {
		NavService.go(event.screen);
	}

	renderWarningBox(screen, message) {
		return (
			<TouchableOpacity key={screen} style={this.styles().warningBox} onPress={() => this.warningBox_press({ screen: screen })} activeOpacity={0.8}>
				<Text style={{ flex: 1 }}>{message}</Text>
			</TouchableOpacity>
		);
	}

	render() {
		function sideMenuButton(styles, onPress) {
			return (
				<TouchableOpacity onPress={onPress}>
					<View style={styles.sideMenuButton}>
						<Icon name="md-menu" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function backButton(styles, onPress, disabled) {
			return (
				<TouchableOpacity onPress={onPress} disabled={disabled}>
					<View style={disabled ? styles.backButtonDisabled : styles.backButton}>
						<Icon name="md-arrow-back" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function saveButton(styles, onPress, disabled, show) {
			if (!show) return null;

			const icon = disabled ? <Icon name="md-checkmark" style={styles.savedButtonIcon} /> : <Image style={styles.saveButtonIcon} source={require('./SaveIcon.png')} />;

			return (
				<TouchableOpacity onPress={onPress} disabled={disabled} style={{ padding: 0 }}>
					<View style={disabled ? styles.saveButtonDisabled : styles.saveButton}>{icon}</View>
				</TouchableOpacity>
			);
		}

		const renderTopButton = (options) => {
			if (!options.visible) return null;

			const icon = <Icon name={options.iconName} style={this.styles().topIcon} />;
			const viewStyle = options.disabled ? this.styles().iconButtonDisabled : this.styles().iconButton;

			return (
				<TouchableOpacity onPress={options.onPress} style={{ padding: 0 }} disabled={!!options.disabled}>
					<View style={viewStyle}>{icon}</View>
				</TouchableOpacity>
			);
		};

		const renderUndoButton = () => {
			return renderTopButton({
				iconName: 'md-undo',
				onPress: this.props.onUndoButtonPress,
				visible: this.props.showUndoButton,
				disabled: this.props.undoButtonDisabled,
			});
		};

		const renderRedoButton = () => {
			return renderTopButton({
				iconName: 'md-redo',
				onPress: this.props.onRedoButtonPress,
				visible: this.props.showRedoButton,
			});
		};

		function selectAllButton(styles, onPress) {
			return (
				<TouchableOpacity onPress={onPress}>
					<View style={styles.iconButton}>
						<Icon name="md-checkmark-circle-outline" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function searchButton(styles, onPress) {
			return (
				<TouchableOpacity onPress={onPress}>
					<View style={styles.iconButton}>
						<Icon name="md-search" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function deleteButton(styles, onPress, disabled) {
			return (
				<TouchableOpacity onPress={onPress} disabled={disabled}>
					<View style={disabled ? styles.iconButtonDisabled : styles.iconButton}>
						<Icon name="md-trash" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function duplicateButton(styles, onPress, disabled) {
			return (
				<TouchableOpacity onPress={onPress} disabled={disabled}>
					<View style={disabled ? styles.iconButtonDisabled : styles.iconButton}>
						<Icon name="md-copy" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function sortButton(styles, onPress) {
			return (
				<TouchableOpacity onPress={onPress}>
					<View style={styles.iconButton}>
						<Icon name="md-funnel" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		let key = 0;
		const menuOptionComponents = [];

		if (!this.props.noteSelectionEnabled) {
			for (let i = 0; i < this.props.menuOptions.length; i++) {
				const o = this.props.menuOptions[i];

				if (o.isDivider) {
					menuOptionComponents.push(<View key={`menuOption_${key++}`} style={this.styles().divider} />);
				} else {
					menuOptionComponents.push(
						<MenuOption value={o.onPress} key={`menuOption_${key++}`} style={this.styles().contextMenuItem}>
							<Text style={this.styles().contextMenuItemText}>{o.title}</Text>
						</MenuOption>
					);
				}
			}

			if (menuOptionComponents.length) {
				menuOptionComponents.push(<View key={`menuOption_${key++}`} style={this.styles().divider} />);
			}
		} else {
			menuOptionComponents.push(
				<MenuOption value={() => this.deleteButton_press()} key={'menuOption_delete'} style={this.styles().contextMenuItem}>
					<Text style={this.styles().contextMenuItemText}>{_('Delete')}</Text>
				</MenuOption>
			);

			menuOptionComponents.push(
				<MenuOption value={() => this.duplicateButton_press()} key={'menuOption_duplicate'} style={this.styles().contextMenuItem}>
					<Text style={this.styles().contextMenuItemText}>{_('Duplicate')}</Text>
				</MenuOption>
			);
		}

		const createTitleComponent = (disabled) => {
			const themeId = Setting.value('theme');
			const theme = themeStyle(themeId);
			const folderPickerOptions = this.props.folderPickerOptions;

			if (folderPickerOptions && folderPickerOptions.enabled) {
				const addFolderChildren = (folders, pickerItems, indent) => {
					folders.sort((a, b) => {
						const aTitle = a && a.title ? a.title : '';
						const bTitle = b && b.title ? b.title : '';
						return aTitle.toLowerCase() < bTitle.toLowerCase() ? -1 : +1;
					});

					for (let i = 0; i < folders.length; i++) {
						const f = folders[i];
						pickerItems.push({ label: `${'      '.repeat(indent)} ${Folder.displayTitle(f)}`, value: f.id });
						pickerItems = addFolderChildren(f.children, pickerItems, indent + 1);
					}

					return pickerItems;
				};

				const titlePickerItems = mustSelect => {
					const folders = this.props.folders.filter(f => f.id !== Folder.conflictFolderId());
					let output = [];
					if (mustSelect) output.push({ label: _('Move to notebook...'), value: null });
					const folderTree = Folder.buildTree(folders);
					output = addFolderChildren(folderTree, output, 0);
					return output;
				};

				return (
					<Dropdown
						items={titlePickerItems(!!folderPickerOptions.mustSelect)}
						itemHeight={35}
						disabled={disabled}
						labelTransform="trim"
						selectedValue={'selectedFolderId' in folderPickerOptions ? folderPickerOptions.selectedFolderId : null}
						itemListStyle={{
							backgroundColor: theme.backgroundColor,
						}}
						headerStyle={{
							color: theme.colorBright2,
							fontSize: theme.fontSize,
							opacity: disabled ? theme.disabledOpacity : 1,
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
				const title = 'title' in this.props && this.props.title !== null ? this.props.title : '';
				return <Text ellipsizeMode={'tail'} numberOfLines={1} style={this.styles().titleText}>{title}</Text>;
			}
		};

		const warningComps = [];

		if (this.props.showMissingMasterKeyMessage) warningComps.push(this.renderWarningBox('EncryptionConfig', _('Press to set the decryption password.')));
		if (this.props.hasDisabledSyncItems) warningComps.push(this.renderWarningBox('Status', _('Some items cannot be synchronised. Press for more info.')));
		if (this.props.shouldUpgradeSyncTarget && this.props.showShouldUpgradeSyncTargetMessage !== false) warningComps.push(this.renderWarningBox('UpgradeSyncTarget', _('The sync target needs to be upgraded. Press this banner to proceed.')));

		const showSideMenuButton = !!this.props.showSideMenuButton && !this.props.noteSelectionEnabled;
		const showSelectAllButton = this.props.noteSelectionEnabled;
		const showSearchButton = !!this.props.showSearchButton && !this.props.noteSelectionEnabled;
		const showContextMenuButton = this.props.showContextMenuButton !== false;
		const showBackButton = !!this.props.noteSelectionEnabled || this.props.showBackButton !== false;

		let backButtonDisabled = !this.props.historyCanGoBack;
		if (this.props.noteSelectionEnabled) backButtonDisabled = false;
		const headerItemDisabled = !this.props.selectedNoteIds.length > 0;

		const titleComp = createTitleComponent(headerItemDisabled);
		const sideMenuComp = !showSideMenuButton ? null : sideMenuButton(this.styles(), () => this.sideMenuButton_press());
		const backButtonComp = !showBackButton ? null : backButton(this.styles(), () => this.backButton_press(), backButtonDisabled);
		const selectAllButtonComp = !showSelectAllButton ? null : selectAllButton(this.styles(), () => this.selectAllButton_press());
		const searchButtonComp = !showSearchButton ? null : searchButton(this.styles(), () => this.searchButton_press());
		const deleteButtonComp = this.props.noteSelectionEnabled ? deleteButton(this.styles(), () => this.deleteButton_press(), headerItemDisabled) : null;
		const duplicateButtonComp = this.props.noteSelectionEnabled ? duplicateButton(this.styles(), () => this.duplicateButton_press(), headerItemDisabled) : null;
		const sortButtonComp = !this.props.noteSelectionEnabled && this.props.sortButton_press ? sortButton(this.styles(), () => this.props.sortButton_press()) : null;
		const windowHeight = Dimensions.get('window').height - 50;

		const contextMenuStyle = { paddingTop: PADDING_V, paddingBottom: PADDING_V };

		// HACK: if this button is removed during selection mode, the header layout is broken, so for now just make it 1 pixel large (normally it should be hidden)
		if (this.props.noteSelectionEnabled) contextMenuStyle.width = 1;

		const menuComp =
			!menuOptionComponents.length || !showContextMenuButton ? null : (
				<Menu onSelect={value => this.menu_select(value)} style={this.styles().contextMenu}>
					<MenuTrigger style={contextMenuStyle}>
						<Icon name="md-more" style={this.styles().contextMenuTrigger} />
					</MenuTrigger>
					<MenuOptions>
						<ScrollView style={{ maxHeight: windowHeight }}>{menuOptionComponents}</ScrollView>
					</MenuOptions>
				</Menu>
			);

		return (
			<View style={this.styles().container}>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					{sideMenuComp}
					{backButtonComp}
					{renderUndoButton(this.styles())}
					{renderRedoButton(this.styles())}
					{saveButton(
						this.styles(),
						() => {
							if (this.props.onSaveButtonPress) this.props.onSaveButtonPress();
						},
						this.props.saveButtonDisabled === true,
						this.props.showSaveButton === true
					)}
					{titleComp}
					{selectAllButtonComp}
					{searchButtonComp}
					{deleteButtonComp}
					{duplicateButtonComp}
					{sortButtonComp}
					{menuComp}
				</View>
				{warningComps}
				<DialogBox
					ref={dialogbox => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

ScreenHeaderComponent.defaultProps = {
	menuOptions: [],
};

const ScreenHeader = connect(state => {
	return {
		historyCanGoBack: state.historyCanGoBack,
		locale: state.settings.locale,
		folders: state.folders,
		theme: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
		selectedNoteIds: state.selectedNoteIds,
		showMissingMasterKeyMessage: state.notLoadedMasterKeys.length && state.masterKeys.length,
		hasDisabledSyncItems: state.hasDisabledSyncItems,
		shouldUpgradeSyncTarget: state.settings['sync.upgradeState'] === Setting.SYNC_UPGRADE_STATE_SHOULD_DO,
	};
})(ScreenHeaderComponent);

module.exports = { ScreenHeader };
