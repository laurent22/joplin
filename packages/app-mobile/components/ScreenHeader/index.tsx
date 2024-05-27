import * as React from 'react';
import { PureComponent, ReactElement } from 'react';
import { connect } from 'react-redux';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, ViewStyle } from 'react-native';
const Icon = require('react-native-vector-icons/Ionicons').default;
const { BackButtonService } = require('../../services/back-button.js');
import NavService from '@joplin/lib/services/NavService';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { _, _n } from '@joplin/lib/locale';
import Note from '@joplin/lib/models/Note';
import Folder from '@joplin/lib/models/Folder';
import { themeStyle } from '../global-style';
import { OnValueChangedListener } from '../Dropdown';
const { dialogs } = require('../../utils/dialogs.js');
const DialogBox = require('react-native-dialogbox').default;
import { FolderEntity } from '@joplin/lib/services/database/types';
import { State } from '@joplin/lib/reducer';
import IconButton from '../IconButton';
import FolderPicker from '../FolderPicker';
import { itemIsInTrash } from '@joplin/lib/services/trash';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import { ModelType } from '@joplin/lib/BaseModel';
import { PluginStates } from '@joplin/lib/services/plugins/reducer';
import { ContainerType } from '@joplin/lib/services/plugins/WebviewController';
import { Dispatch } from 'redux';
import WarningBanner from './WarningBanner';

// Rather than applying a padding to the whole bar, it is applied to each
// individual component (button, picker, etc.) so that the touchable areas
// are widder and to give more room to the picker component which has a larger
// default height.
const PADDING_V = 10;

type OnSelectCallbackType=()=> void;
type OnPressCallback=()=> void;

export type MenuOptionType = {
	onPress: OnPressCallback;
	isDivider?: boolean;
	title: string;
	disabled?: boolean;
}|{
	isDivider: true;
	title?: undefined;
	onPress?: undefined;
	disabled?: false;
};

interface ScreenHeaderProps {
	selectedNoteIds: string[];
	selectedFolderId: string;
	notesParentType: string;
	noteSelectionEnabled: boolean;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	parentComponent: any;
	showUndoButton: boolean;
	undoButtonDisabled?: boolean;
	showRedoButton: boolean;
	menuOptions: MenuOptionType[];
	title?: string|null;
	folders: FolderEntity[];
	folderPickerOptions?: {
		enabled: boolean;
		selectedFolderId?: string;
		onValueChange?: OnValueChangedListener;
		mustSelect?: boolean;
	};
	plugins: PluginStates;

	dispatch: Dispatch;
	onUndoButtonPress: OnPressCallback;
	onRedoButtonPress: OnPressCallback;
	onSaveButtonPress: OnPressCallback;
	sortButton_press?: OnPressCallback;
	onSearchButtonPress?: OnPressCallback;

	showSideMenuButton?: boolean;
	showSearchButton?: boolean;
	showContextMenuButton?: boolean;
	showBackButton?: boolean;

	saveButtonDisabled?: boolean;
	showSaveButton?: boolean;

	historyCanGoBack?: boolean;
	showShouldUpgradeSyncTargetMessage?: boolean;

	themeId: number;
}

interface ScreenHeaderState {
}

class ScreenHeaderComponent extends PureComponent<ScreenHeaderProps, ScreenHeaderState> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private cachedStyles: any;
	public dialogbox?: typeof DialogBox;
	public constructor(props: ScreenHeaderProps) {
		super(props);
		this.cachedStyles = {};
	}

	private styles() {
		const themeId = this.props.themeId;
		if (this.cachedStyles[themeId]) return this.cachedStyles[themeId];
		this.cachedStyles = {};

		const theme = themeStyle(themeId);

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const styleObject: any = {
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
		};

		styleObject.contextMenuItemTextDisabled = {
			...styleObject.contextMenuItemText,
			opacity: 0.5,
		};

		styleObject.topIcon = { ...theme.icon };
		styleObject.topIcon.flex = 1;
		styleObject.topIcon.textAlignVertical = 'center';
		styleObject.topIcon.color = theme.colorBright2;

		styleObject.backButton = { ...styleObject.iconButton };
		styleObject.backButton.marginRight = 1;

		styleObject.backButtonDisabled = { ...styleObject.backButton, opacity: theme.disabledOpacity };
		styleObject.saveButtonDisabled = { ...styleObject.saveButton, opacity: theme.disabledOpacity };
		styleObject.iconButtonDisabled = { ...styleObject.iconButton, opacity: theme.disabledOpacity };

		this.cachedStyles[themeId] = StyleSheet.create(styleObject);
		return this.cachedStyles[themeId];
	}

	private sideMenuButton_press() {
		this.props.dispatch({ type: 'SIDE_MENU_TOGGLE' });
	}

	private async backButton_press() {
		if (this.props.noteSelectionEnabled) {
			this.props.dispatch({ type: 'NOTE_SELECTION_END' });
		} else {
			await BackButtonService.back();
		}
	}

	private selectAllButton_press() {
		this.props.dispatch({ type: 'NOTE_SELECT_ALL_TOGGLE' });
	}

	private searchButton_press() {
		if (this.props.onSearchButtonPress) {
			this.props.onSearchButtonPress();
		} else {
			void NavService.go('Search');
		}
	}

	private pluginPanelToggleButton_press() {
		this.props.dispatch({ type: 'SET_PLUGIN_PANELS_DIALOG_VISIBLE', visible: true });
	}

	private async duplicateButton_press() {
		const noteIds = this.props.selectedNoteIds;

		this.props.dispatch({ type: 'NOTE_SELECTION_END' });

		try {
			// Duplicate all selected notes. ensureUniqueTitle is set to true to use the
			// original note's name as a root for the new unique identifier.
			await Note.duplicateMultipleNotes(noteIds, { ensureUniqueTitle: true });
		} catch (error) {
			alert(_n('This note could not be duplicated: %s', 'These notes could not be duplicated: %s', noteIds.length, error.message));
		}
	}

	private async deleteButton_press() {
		// Dialog needs to be displayed as a child of the parent component, otherwise
		// it won't be visible within the header component.
		const noteIds = this.props.selectedNoteIds;
		this.props.dispatch({ type: 'NOTE_SELECTION_END' });

		try {
			await Note.batchDelete(noteIds, { toTrash: true, sourceDescription: 'Delete selected notes button' });
		} catch (error) {
			alert(_n('This note could not be deleted: %s', 'These notes could not be deleted: %s', noteIds.length, error.message));
		}
	}

	private async restoreButton_press() {
		// Dialog needs to be displayed as a child of the parent component, otherwise
		// it won't be visible within the header component.
		const noteIds = this.props.selectedNoteIds;
		this.props.dispatch({ type: 'NOTE_SELECTION_END' });

		try {
			await restoreItems(ModelType.Note, noteIds);
		} catch (error) {
			alert(`Could not restore note(s): ${error.message}`);
		}
	}

	private menu_select(value: OnSelectCallbackType) {
		if (typeof value === 'function') {
			value();
		}
	}

	public render() {
		const themeId = this.props.themeId;
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function sideMenuButton(styles: any, onPress: OnPressCallback) {
			return (
				<TouchableOpacity
					onPress={onPress}

					accessibilityLabel={_('Sidebar')}
					accessibilityHint={_('Show/hide the sidebar')}
					accessibilityRole="button">
					<View style={styles.sideMenuButton}>
						<Icon name="menu" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function backButton(styles: any, onPress: OnPressCallback, disabled: boolean) {
			return (
				<TouchableOpacity
					onPress={onPress}
					disabled={disabled}

					accessibilityLabel={_('Back')}
					accessibilityRole="button">
					<View style={disabled ? styles.backButtonDisabled : styles.backButton}>
						<Icon
							name="arrow-back"
							style={styles.topIcon}
						/>
					</View>
				</TouchableOpacity>
			);
		}

		function saveButton(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
			styles: any, onPress: OnPressCallback, disabled: boolean, show: boolean,
		) {
			if (!show) return null;

			const icon = disabled ? <Icon name="checkmark" style={styles.savedButtonIcon} /> : <Image style={styles.saveButtonIcon} source={require('./SaveIcon.png')} />;

			return (
				<TouchableOpacity
					onPress={onPress}
					disabled={disabled}
					style={{ padding: 0 }}

					accessibilityLabel={_('Save changes')}
					accessibilityRole="button">
					<View style={disabled ? styles.saveButtonDisabled : styles.saveButton}>{icon}</View>
				</TouchableOpacity>
			);
		}

		interface TopButtonOptions {
			visible: boolean;
			iconName: string;
			disabled?: boolean;
			description: string;
			onPress: OnPressCallback;
		}
		const renderTopButton = (options: TopButtonOptions) => {
			if (!options.visible) return null;

			const viewStyle = options.disabled ? this.styles().iconButtonDisabled : this.styles().iconButton;

			return (
				<IconButton
					onPress={options.onPress}
					containerStyle={{ padding: 0 }}
					contentWrapperStyle={viewStyle}
					themeId={themeId}
					disabled={!!options.disabled}
					description={options.description}
					iconName={options.iconName}
					iconStyle={this.styles().topIcon}
				/>
			);
		};

		const renderUndoButton = () => {
			return renderTopButton({
				iconName: 'ionicon arrow-undo-circle-sharp',
				description: _('Undo'),
				onPress: this.props.onUndoButtonPress,
				visible: this.props.showUndoButton,
				disabled: this.props.undoButtonDisabled,
			});
		};

		const renderRedoButton = () => {
			return renderTopButton({
				iconName: 'ionicon arrow-redo-circle-sharp',
				description: _('Redo'),
				onPress: this.props.onRedoButtonPress,
				visible: this.props.showRedoButton,
			});
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function selectAllButton(styles: any, onPress: OnPressCallback) {
			return (
				<IconButton
					onPress={onPress}

					themeId={themeId}
					description={_('Select all')}
					contentWrapperStyle={styles.iconButton}

					iconName="ionicon checkmark-circle-outline"
					iconStyle={styles.topIcon}
				/>
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function searchButton(styles: any, onPress: OnPressCallback) {
			return (
				<IconButton
					onPress={onPress}

					description={_('Search')}
					themeId={themeId}
					contentWrapperStyle={styles.iconButton}

					iconName='ionicon search'
					iconStyle={styles.topIcon}
				/>
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const pluginPanelToggleButton = (styles: any, onPress: OnPressCallback) => {
			const allPluginViews = Object.values(this.props.plugins).map(plugin => Object.values(plugin.views)).flat();
			const allVisiblePanels = allPluginViews.filter(
				view => view.containerType === ContainerType.Panel && view.opened,
			);
			if (allVisiblePanels.length === 0) return null;

			return (
				<IconButton
					onPress={onPress}
					description={_('Plugin panels')}
					themeId={themeId}
					contentWrapperStyle={styles.iconButton}

					iconName="ionicon extension-puzzle"
					iconStyle={styles.topIcon}
				/>
			);
		};

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function deleteButton(styles: any, onPress: OnPressCallback, disabled: boolean) {
			return (
				<IconButton
					onPress={onPress}
					disabled={disabled}

					themeId={themeId}
					description={_('Delete')}
					accessibilityHint={
						disabled ? null : _('Delete selected notes')
					}
					contentWrapperStyle={disabled ? styles.iconButtonDisabled : styles.iconButton}

					iconName='ionicon trash'
					iconStyle={styles.topIcon}
				/>
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function restoreButton(styles: any, onPress: OnPressCallback, disabled: boolean) {
			return (
				<IconButton
					onPress={onPress}
					disabled={disabled}

					themeId={themeId}
					description={_('Restore')}
					accessibilityHint={
						disabled ? null : _('Restore')
					}
					contentWrapperStyle={disabled ? styles.iconButtonDisabled : styles.iconButton}

					iconName='ionicon reload-circle'
					iconStyle={styles.topIcon}
				/>
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function duplicateButton(styles: any, onPress: OnPressCallback, disabled: boolean) {
			return (
				<IconButton
					onPress={onPress}
					disabled={disabled}

					themeId={themeId}
					description={_('Duplicate')}
					accessibilityHint={
						disabled ? null : _('Duplicate selected notes')
					}
					contentWrapperStyle={disabled ? styles.iconButtonDisabled : styles.iconButton}
					iconName='ionicon copy'
					iconStyle={styles.topIcon}
				/>
			);
		}

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		function sortButton(styles: any, onPress: OnPressCallback) {
			return (
				<TouchableOpacity
					onPress={onPress}

					accessibilityLabel={_('Sort notes by')}
					accessibilityRole="button">
					<View style={styles.iconButton}>
						<Icon name="filter-outline" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		let key = 0;
		const menuOptionComponents = [];

		const selectedFolder = this.props.notesParentType === 'Folder' ? Folder.byId(this.props.folders, this.props.selectedFolderId) : null;
		const selectedFolderInTrash = itemIsInTrash(selectedFolder);

		if (!this.props.noteSelectionEnabled) {
			for (let i = 0; i < this.props.menuOptions.length; i++) {
				const o = this.props.menuOptions[i];

				if (o.isDivider) {
					menuOptionComponents.push(<View key={`menuOption_${key++}`} style={this.styles().divider} />);
				} else {
					menuOptionComponents.push(
						<MenuOption value={o.onPress} key={`menuOption_${key++}`} style={this.styles().contextMenuItem} disabled={!!o.disabled}>
							<Text style={o.disabled ? this.styles().contextMenuItemTextDisabled : this.styles().contextMenuItemText}>{o.title}</Text>
						</MenuOption>,
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
				</MenuOption>,
			);

			menuOptionComponents.push(
				<MenuOption value={() => this.duplicateButton_press()} key={'menuOption_duplicate'} style={this.styles().contextMenuItem}>
					<Text style={this.styles().contextMenuItemText}>{_('Duplicate')}</Text>
				</MenuOption>,
			);
		}

		const createTitleComponent = (disabled: boolean, hideableAfterTitleComponents: ReactElement) => {
			const folderPickerOptions = this.props.folderPickerOptions;

			if (folderPickerOptions && folderPickerOptions.enabled) {
				return (
					<FolderPicker
						themeId={themeId}
						disabled={disabled}
						selectedFolderId={'selectedFolderId' in folderPickerOptions ? folderPickerOptions.selectedFolderId : null}
						onValueChange={async (folderId) => {
							// If onValueChange is specified, use this as a callback, otherwise do the default
							// which is to take the selectedNoteIds from the state and move them to the
							// chosen folder.

							if (folderPickerOptions.onValueChange) {
								folderPickerOptions.onValueChange(folderId);
								return;
							}

							if (!folderId) return;
							const noteIds = this.props.selectedNoteIds;
							if (!noteIds.length) return;

							const folder = await Folder.load(folderId);

							const ok = noteIds.length > 1 ? await dialogs.confirm(this.props.parentComponent, _('Move %d notes to notebook "%s"?', noteIds.length, folder.title)) : true;
							if (!ok) return;

							this.props.dispatch({ type: 'NOTE_SELECTION_END' });

							try {
								for (let i = 0; i < noteIds.length; i++) {
									await Note.moveToFolder(noteIds[i], folderId);
								}
							} catch (error) {
								alert(_n('This note could not be moved: %s', 'These notes could not be moved: %s', noteIds.length, error.message));
							}
						}}
						mustSelect={!!folderPickerOptions.mustSelect}
						folders={Folder.getRealFolders(this.props.folders)}
						coverableChildrenRight={hideableAfterTitleComponents}
					/>
				);
			} else {
				const title = 'title' in this.props && this.props.title !== null ? this.props.title : '';
				return (
					<>
						<Text ellipsizeMode={'tail'} numberOfLines={1} style={this.styles().titleText}>{title}</Text>
						{hideableAfterTitleComponents}
					</>
				);
			}
		};

		const showSideMenuButton = !!this.props.showSideMenuButton && !this.props.noteSelectionEnabled;
		const showSelectAllButton = this.props.noteSelectionEnabled;
		const showSearchButton = !!this.props.showSearchButton && !this.props.noteSelectionEnabled;
		const showContextMenuButton = this.props.showContextMenuButton !== false;
		const showBackButton = !!this.props.noteSelectionEnabled || this.props.showBackButton !== false;

		let backButtonDisabled = !this.props.historyCanGoBack;
		if (this.props.noteSelectionEnabled) backButtonDisabled = false;
		const headerItemDisabled = !(this.props.selectedNoteIds.length > 0);

		const sideMenuComp = !showSideMenuButton ? null : sideMenuButton(this.styles(), () => this.sideMenuButton_press());
		const backButtonComp = !showBackButton ? null : backButton(this.styles(), () => this.backButton_press(), backButtonDisabled);
		const pluginPanelsComp = pluginPanelToggleButton(this.styles(), () => this.pluginPanelToggleButton_press());
		const selectAllButtonComp = !showSelectAllButton ? null : selectAllButton(this.styles(), () => this.selectAllButton_press());
		const searchButtonComp = !showSearchButton ? null : searchButton(this.styles(), () => this.searchButton_press());
		const deleteButtonComp = !selectedFolderInTrash && this.props.noteSelectionEnabled ? deleteButton(this.styles(), () => this.deleteButton_press(), headerItemDisabled) : null;
		const restoreButtonComp = selectedFolderInTrash && this.props.noteSelectionEnabled ? restoreButton(this.styles(), () => this.restoreButton_press(), headerItemDisabled) : null;
		const duplicateButtonComp = !selectedFolderInTrash && this.props.noteSelectionEnabled ? duplicateButton(this.styles(), () => this.duplicateButton_press(), headerItemDisabled) : null;
		const sortButtonComp = !this.props.noteSelectionEnabled && this.props.sortButton_press ? sortButton(this.styles(), () => this.props.sortButton_press()) : null;

		// To allow the notebook dropdown (and perhaps other components) to have sufficient
		// space while in use, we allow certain buttons to be hidden.
		const hideableRightComponents = pluginPanelsComp;

		const titleComp = createTitleComponent(headerItemDisabled, hideableRightComponents);
		const windowHeight = Dimensions.get('window').height - 50;

		const contextMenuStyle: ViewStyle = {
			paddingTop: PADDING_V,
			paddingBottom: PADDING_V,
		};

		// HACK: if this button is removed during selection mode, the header layout is broken, so for now just make it 1 pixel large (normally it should be hidden)
		if (this.props.noteSelectionEnabled) contextMenuStyle.width = 1;

		const menuComp =
			!menuOptionComponents.length || !showContextMenuButton ? null : (
				<Menu onSelect={value => this.menu_select(value)} style={this.styles().contextMenu}>
					<MenuTrigger style={contextMenuStyle}>
						<View accessibilityLabel={_('Actions')}>
							<Icon name="ellipsis-vertical" style={this.styles().contextMenuTrigger} />
						</View>
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
					{renderUndoButton()}
					{renderRedoButton()}
					{saveButton(
						this.styles(),
						() => {
							if (this.props.onSaveButtonPress) this.props.onSaveButtonPress();
						},
						this.props.saveButtonDisabled === true,
						this.props.showSaveButton === true,
					)}
					{titleComp}
					{selectAllButtonComp}
					{searchButtonComp}
					{deleteButtonComp}
					{restoreButtonComp}
					{duplicateButtonComp}
					{sortButtonComp}
					{menuComp}
				</View>
				<WarningBanner
					showShouldUpgradeSyncTargetMessage={this.props.showShouldUpgradeSyncTargetMessage}
				/>
				<DialogBox
					ref={(dialogbox: typeof DialogBox) => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}

	public static defaultProps: Partial<ScreenHeaderProps> = {
		menuOptions: [],
	};
}

const ScreenHeader = connect((state: State) => {
	return {
		historyCanGoBack: state.historyCanGoBack,
		locale: state.settings.locale,
		folders: state.folders,
		themeId: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
		selectedNoteIds: state.selectedNoteIds,
		selectedFolderId: state.selectedFolderId,
		notesParentType: state.notesParentType,
		plugins: state.pluginService.plugins,
	};
})(ScreenHeaderComponent);

export default ScreenHeader;
export { ScreenHeader };
