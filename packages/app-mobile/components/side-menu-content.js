const React = require('react');
const Component = React.Component;
const { Easing, Animated, TouchableOpacity, Text, StyleSheet, ScrollView, View, Alert } = require('react-native');
const { connect } = require('react-redux');
const Icon = require('react-native-vector-icons/Ionicons').default;
const Folder = require('@joplin/lib/models/Folder').default;
const Synchronizer = require('@joplin/lib/Synchronizer').default;
const NavService = require('@joplin/lib/services/NavService').default;
const { _ } = require('@joplin/lib/locale');
const { themeStyle } = require('./global-style.js');
const shared = require('@joplin/lib/components/shared/side-menu-shared.js');
const { Menu, MenuOptions, MenuOption, MenuTrigger } = require('react-native-popup-menu');

Icon.loadFont();

class SideMenuContentComponent extends Component {
	constructor() {
		super();
		this.state = {
			syncReportText: '',
			moveFolderId: null,
		};
		this.styles_ = {};

		this.tagButton_press = this.tagButton_press.bind(this);
		this.newFolderButton_press = this.newFolderButton_press.bind(this);
		this.synchronize_press = this.synchronize_press.bind(this);
		this.configButton_press = this.configButton_press.bind(this);
		this.allNotesButton_press = this.allNotesButton_press.bind(this);
		this.renderFolderItem = this.renderFolderItem.bind(this);
		this.cancelMove_press = this.cancelMove_press.bind(this);

		this.syncIconRotationValue = new Animated.Value(0);
		this.syncIconRotation = this.syncIconRotationValue.interpolate({
			inputRange: [0, 1],
			outputRange: ['360deg', '0deg'],
		});
	}

	styles() {
		const theme = themeStyle(this.props.themeId);

		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const styles = {
			menu: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
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
			syncStatus: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				color: theme.colorFaded,
				fontSize: theme.fontSizeSmaller,
				flex: 0,
			},
			sidebarIcon: {
				fontSize: 22,
				color: theme.color,
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
		};

		styles.folderButton = Object.assign({}, styles.button);
		styles.folderButton.paddingLeft = 0;
		styles.folderButtonText = Object.assign({}, styles.buttonText);
		styles.folderButtonSelected = Object.assign({}, styles.folderButton);
		styles.folderButtonSelected.backgroundColor = theme.selectedColor;
		styles.folderIcon = Object.assign({}, theme.icon);
		styles.folderIcon.color = theme.colorFaded; // '#0072d5';
		styles.folderIcon.paddingTop = 3;

		styles.sideButton = Object.assign({}, styles.button, { flex: 0 });
		styles.sideButtonSelected = Object.assign({}, styles.sideButton, { backgroundColor: theme.selectedColor });
		styles.sideButtonText = Object.assign({}, styles.buttonText);

		this.styles_[this.props.themeId] = StyleSheet.create(styles);
		return this.styles_[this.props.themeId];
	}

	componentDidUpdate(prevProps) {
		if (this.props.syncStarted !== prevProps.syncStarted) {
			if (this.props.syncStarted) {
				this.syncIconAnimation = Animated.loop(
					Animated.timing(this.syncIconRotationValue, {
						toValue: 1,
						duration: 3000,
						easing: Easing.linear,
					})
				);

				this.syncIconAnimation.start();
			} else {
				if (this.syncIconAnimation) this.syncIconAnimation.stop();
				this.syncIconAnimation = null;
			}
		}
	}

	folder_press(folder) {
		if (this.state.moveFolderId) {
			if (this.state.moveFolderId === folder.id) return;
			Folder.moveToFolder(this.state.moveFolderId, folder.id).then(() => this.setState({ moveFolderId: null }));
		} else {
			this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				folderId: folder.id,
			});
		}
	}

	menu_backdrop_press(folder) {
		this.setState({ [`${folder.id}_context_open`]: false });
	}

	menu_select(folder, value) {
		value();
		this.setState({ [`${folder.id}_context_open`]: false });
	}

	async folder_longPress(folder) {
		if (folder === 'all') return;
		this.setState({ [`${folder.id}_context_open`]: true });
	}

	folder_rename(folder) {
		if (folder.encryption_applied) {
			alert(_('Encrypted notebooks cannot be renamed'));
		}

		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Folder',
			folderId: folder.id,
		});
	}

	folder_delete(folder) {
		Alert.alert('', _('Delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be deleted.', folder.title), [
			{
				text: _('OK'),
				onPress: () => {
					Folder.delete(folder.id);
				},
			},
			{
				text: _('Cancel'),
				onPress: () => { },
				style: 'cancel',
			},
		]);
	}

	folder_move(folder) {
		this.setState({ [`${folder.id}_context_open`]: false });
		this.setState({ moveFolderId: folder.id });
	}

	folder_togglePress(folder) {
		this.props.dispatch({
			type: 'FOLDER_TOGGLE',
			id: folder.id,
		});
	}

	tagButton_press() {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Tags',
		});
	}

	configButton_press() {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
		NavService.go('Config');
	}

	allNotesButton_press() {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			smartFilterId: 'c3176726992c11e9ac940492261af972',
		});
	}

	newFolderButton_press() {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Folder',
			folderId: null,
		});
	}

	async synchronize_press() {
		const actionDone = await shared.synchronize_press(this);
		if (actionDone === 'auth') this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
	}

	cancelMove_press() {
		this.setState({ moveFolderId: null });
	}

	renderFolderItem(folder, selected, hasChildren, depth) {
		const theme = themeStyle(this.props.themeId);

		const folderButtonStyle = {
			flex: 1,
			flexDirection: 'row',
			height: 36,
			alignItems: 'center',
			paddingRight: theme.marginRight,
		};
		if (selected) folderButtonStyle.backgroundColor = theme.selectedColor;
		folderButtonStyle.paddingLeft = depth * 10 + theme.marginLeft;

		const iconWrapperStyle = { paddingLeft: 10, paddingRight: 10 };
		if (selected) iconWrapperStyle.backgroundColor = theme.selectedColor;

		let iconWrapper = null;

		const iconName = this.props.collapsedFolderIds.indexOf(folder.id) >= 0 ? 'chevron-down' : 'chevron-up';
		const iconComp = <Icon name={iconName} style={this.styles().folderIcon} />;

		iconWrapper = !hasChildren ? null : (
			<TouchableOpacity
				style={iconWrapperStyle}
				folderid={folder.id}
				onPress={() => {
					if (hasChildren) this.folder_togglePress(folder);
				}}
			>
				{iconComp}
			</TouchableOpacity>
		);

		return (
			<View key={folder.id} style={{ flex: 1, flexDirection: 'row' }}>
				<TouchableOpacity
					style={{ flex: 1 }}
					onPress={() => {
						this.folder_press(folder);
					}}
					onLongPress={() => {
						this.folder_longPress(folder);
					}}
				>
					<View style={folderButtonStyle}>
						{this.state.moveFolderId && (this.state.moveFolderId !== folder.id) && <Icon name="enter-outline" style={this.styles().sidebarIcon} />}
						<Text numberOfLines={1} style={this.styles().folderButtonText}>
							{Folder.displayTitle(folder)}
						</Text>
						<Menu
							style={this.styles().contextMenu}
							opened={this.state[`${folder.id}_context_open`]}
							onSelect={value => this.menu_select(folder, value)}
							onBackdropPress={() => this.menu_backdrop_press(folder)}
						>
							<MenuTrigger />
							<MenuOptions>
								<MenuOption value={() => this.folder_rename(folder)} key={'menuOption_rename'} style={this.styles().contextMenuItem}>
									<Text style={this.styles().contextMenuItemText}>{_('Rename')}</Text>
								</MenuOption>
								<MenuOption value={() => this.folder_move(folder)} key={'menuOption_move'} style={this.styles().contextMenuItem}>
									<Text style={this.styles().contextMenuItemText}>{_('Move')}</Text>
								</MenuOption>
								<MenuOption value={() => this.folder_delete(folder)} key={'menuOption_delete'} style={this.styles().contextMenuItem}>
									<Text style={this.styles().contextMenuItemText}>{_('Delete')}</Text>
								</MenuOption>
							</MenuOptions>
						</Menu>
					</View>
				</TouchableOpacity>
				{iconWrapper}
			</View>
		);
	}

	renderSidebarButton(key, title, iconName, onPressHandler = null, selected = false) {
		let icon = <Icon name={iconName} style={this.styles().sidebarIcon} />;

		if (key === 'synchronize_button') {
			icon = <Animated.View style={{ transform: [{ rotate: this.syncIconRotation }] }}>{icon}</Animated.View>;
		}

		const content = (
			<View key={key} style={selected ? this.styles().sideButtonSelected : this.styles().sideButton}>
				{icon}
				<Text style={this.styles().sideButtonText}>{title}</Text>
			</View>
		);

		if (!onPressHandler) return content;

		return (
			<TouchableOpacity key={key} onPress={onPressHandler}>
				{content}
			</TouchableOpacity>
		);
	}

	makeDivider(key) {
		const theme = themeStyle(this.props.themeId);
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: theme.dividerColor }} key={key}></View>;
	}

	renderBottomPanel() {
		const theme = themeStyle(this.props.themeId);

		const items = [];

		items.push(this.makeDivider('divider_1'));

		items.push(this.renderSidebarButton('newFolder_button', _('New Notebook'), 'md-folder-open', this.newFolderButton_press));

		items.push(this.renderSidebarButton('tag_button', _('Tags'), 'md-pricetag', this.tagButton_press));

		items.push(this.renderSidebarButton('config_button', _('Configuration'), 'md-settings', this.configButton_press));

		items.push(this.makeDivider('divider_2'));

		const lines = Synchronizer.reportToLines(this.props.syncReport);
		const syncReportText = lines.join('\n');

		let decryptionReportText = '';
		if (this.props.decryptionWorker && this.props.decryptionWorker.state !== 'idle' && this.props.decryptionWorker.itemCount) {
			decryptionReportText = _('Decrypting items: %d/%d', this.props.decryptionWorker.itemIndex + 1, this.props.decryptionWorker.itemCount);
		}

		let resourceFetcherText = '';
		if (this.props.resourceFetcher && this.props.resourceFetcher.toFetchCount) {
			resourceFetcherText = _('Fetching resources: %d/%d', this.props.resourceFetcher.fetchingCount, this.props.resourceFetcher.toFetchCount);
		}

		const fullReport = [];
		if (syncReportText) fullReport.push(syncReportText);
		if (resourceFetcherText) fullReport.push(resourceFetcherText);
		if (decryptionReportText) fullReport.push(decryptionReportText);

		items.push(this.renderSidebarButton('synchronize_button', !this.props.syncStarted ? _('Synchronise') : _('Cancel'), 'md-sync', this.synchronize_press));

		if (fullReport.length) {
			items.push(
				<Text key="sync_report" style={this.styles().syncStatus}>
					{fullReport.join('\n')}
				</Text>
			);
		}

		return <View style={{ flex: 0, flexDirection: 'column', paddingBottom: theme.marginBottom }}>{items}</View>;
	}

	render() {
		let items = [];

		const theme = themeStyle(this.props.themeId);

		// HACK: inner height of ScrollView doesn't appear to be calculated correctly when
		// using padding. So instead creating blank elements for padding bottom and top.
		items.push(<View style={{ height: theme.marginTop }} key="bottom_top_hack" />);

		items.push(this.renderSidebarButton('all_notes', _('All notes'), 'md-document', this.allNotesButton_press, this.props.notesParentType === 'SmartFilter'));

		items.push(this.makeDivider('divider_all'));

		items.push(this.renderSidebarButton('folder_header', _('Notebooks'), 'md-folder'));

		if (this.props.folders.length) {
			const result = shared.renderFolders(this.props, this.renderFolderItem);
			const folderItems = result.items;
			items = items.concat(folderItems);
		}

		if (this.state.moveFolderId) { items.push(this.renderSidebarButton('cancel_move', _('Cancel'), 'close-circle-outline', this.cancelMove_press)); }

		const style = {
			flex: 1,
			borderRightWidth: 1,
			borderRightColor: theme.dividerColor,
			backgroundColor: theme.backgroundColor,
		};

		return (
			<View style={style}>
				<View style={{ flex: 1, opacity: this.props.opacity }}>
					<ScrollView scrollsToTop={false} style={this.styles().menu}>
						{items}
					</ScrollView>
					{this.renderBottomPanel()}
				</View>
			</View>
		);
	}
}

const SideMenuContent = connect(state => {
	return {
		folders: state.folders,
		syncStarted: state.syncStarted,
		syncReport: state.syncReport,
		selectedFolderId: state.selectedFolderId,
		selectedTagId: state.selectedTagId,
		notesParentType: state.notesParentType,
		locale: state.settings.locale,
		themeId: state.settings.theme,
		// Don't do the opacity animation as it means re-rendering the list multiple times
		// opacity: state.sideMenuOpenPercent,
		collapsedFolderIds: state.collapsedFolderIds,
		decryptionWorker: state.decryptionWorker,
		resourceFetcher: state.resourceFetcher,
	};
})(SideMenuContentComponent);

module.exports = { SideMenuContent };
