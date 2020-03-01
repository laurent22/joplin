const React = require('react');
const Component = React.Component;
const { Easing, Animated, TouchableOpacity, Text, StyleSheet, ScrollView, View, Alert } = require('react-native');
const { connect } = require('react-redux');
const Icon = require('react-native-vector-icons/Ionicons').default;
const Folder = require('lib/models/Folder.js');
const { Synchronizer } = require('lib/synchronizer.js');
const NavService = require('lib/services/NavService.js');
const { _ } = require('lib/locale.js');
const { globalStyle, themeStyle } = require('lib/components/global-style.js');
const shared = require('lib/components/shared/side-menu-shared.js');

Icon.loadFont();

class SideMenuContentComponent extends Component {
	constructor() {
		super();
		this.state = {
			syncReportText: '',
		};
		this.styles_ = {};

		this.tagButton_press = this.tagButton_press.bind(this);
		this.newFolderButton_press = this.newFolderButton_press.bind(this);
		this.synchronize_press = this.synchronize_press.bind(this);
		this.configButton_press = this.configButton_press.bind(this);
		this.allNotesButton_press = this.allNotesButton_press.bind(this);
		this.renderFolderItem = this.renderFolderItem.bind(this);

		this.syncIconRotationValue = new Animated.Value(0);
		this.syncIconRotation = this.syncIconRotationValue.interpolate({
			inputRange: [0, 1],
			outputRange: ['360deg', '0deg'],
		});
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};

		let styles = {
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

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
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
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folder.id,
		});
	}

	async folder_longPress(folder) {
		if (folder === 'all') return;

		Alert.alert(
			'',
			_('Notebook: %s', folder.title),
			[
				{
					text: _('Rename'),
					onPress: () => {
						if (folder.encryption_applied) {
							alert(_('Encrypted notebooks cannot be renamed'));
							return;
						}

						this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

						this.props.dispatch({
							type: 'NAV_GO',
							routeName: 'Folder',
							folderId: folder.id,
						});
					},
				},
				{
					text: _('Delete'),
					onPress: () => {
						Alert.alert('', _('Delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be deleted.', folder.title), [
							{
								text: _('OK'),
								onPress: () => {
									Folder.delete(folder.id);
								},
							},
							{
								text: _('Cancel'),
								onPress: () => {},
								style: 'cancel',
							},
						]);
					},
					style: 'destructive',
				},
				{
					text: _('Cancel'),
					onPress: () => {},
					style: 'cancel',
				},
			],
			{
				cancelable: false,
			}
		);
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

	renderFolderItem(folder, selected, hasChildren, depth) {
		const theme = themeStyle(this.props.theme);

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

		const iconName = this.props.collapsedFolderIds.indexOf(folder.id) >= 0 ? 'md-arrow-dropdown' : 'md-arrow-dropup';
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
						<Text numberOfLines={1} style={this.styles().folderButtonText}>
							{Folder.displayTitle(folder)}
						</Text>
					</View>
				</TouchableOpacity>
				{iconWrapper}
			</View>
		);
	}

	renderSideBarButton(key, title, iconName, onPressHandler = null, selected = false) {
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
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: globalStyle.dividerColor }} key={key}></View>;
	}

	renderBottomPanel() {
		const theme = themeStyle(this.props.theme);

		const items = [];

		items.push(this.makeDivider('divider_1'));

		items.push(this.renderSideBarButton('newFolder_button', _('New Notebook'), 'md-folder-open', this.newFolderButton_press));

		items.push(this.renderSideBarButton('tag_button', _('Tags'), 'md-pricetag', this.tagButton_press));

		items.push(this.renderSideBarButton('config_button', _('Configuration'), 'md-settings', this.configButton_press));

		items.push(this.makeDivider('divider_2'));

		let lines = Synchronizer.reportToLines(this.props.syncReport);
		const syncReportText = lines.join('\n');

		let decryptionReportText = '';
		if (this.props.decryptionWorker && this.props.decryptionWorker.state !== 'idle' && this.props.decryptionWorker.itemCount) {
			decryptionReportText = _('Decrypting items: %d/%d', this.props.decryptionWorker.itemIndex + 1, this.props.decryptionWorker.itemCount);
		}

		let resourceFetcherText = '';
		if (this.props.resourceFetcher && this.props.resourceFetcher.toFetchCount) {
			resourceFetcherText = _('Fetching resources: %d/%d', this.props.resourceFetcher.fetchingCount, this.props.resourceFetcher.toFetchCount);
		}

		let fullReport = [];
		if (syncReportText) fullReport.push(syncReportText);
		if (resourceFetcherText) fullReport.push(resourceFetcherText);
		if (decryptionReportText) fullReport.push(decryptionReportText);

		items.push(this.renderSideBarButton('synchronize_button', !this.props.syncStarted ? _('Synchronise') : _('Cancel'), 'md-sync', this.synchronize_press));

		if (fullReport.length)
			items.push(
				<Text key="sync_report" style={this.styles().syncStatus}>
					{fullReport.join('\n')}
				</Text>
			);

		return <View style={{ flex: 0, flexDirection: 'column', paddingBottom: theme.marginBottom }}>{items}</View>;
	}

	render() {
		let items = [];

		const theme = themeStyle(this.props.theme);

		// HACK: inner height of ScrollView doesn't appear to be calculated correctly when
		// using padding. So instead creating blank elements for padding bottom and top.
		items.push(<View style={{ height: globalStyle.marginTop }} key="bottom_top_hack" />);

		items.push(this.renderSideBarButton('all_notes', _('All notes'), 'md-document', this.allNotesButton_press, this.props.notesParentType === 'SmartFilter'));

		items.push(this.makeDivider('divider_all'));

		items.push(this.renderSideBarButton('folder_header', _('Notebooks'), 'md-folder'));

		if (this.props.folders.length) {
			const result = shared.renderFolders(this.props, this.renderFolderItem);
			const folderItems = result.items;
			items = items.concat(folderItems);
		}

		let style = {
			flex: 1,
			borderRightWidth: 1,
			borderRightColor: globalStyle.dividerColor,
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
		theme: state.settings.theme,
		// Don't do the opacity animation as it means re-rendering the list multiple times
		// opacity: state.sideMenuOpenPercent,
		collapsedFolderIds: state.collapsedFolderIds,
		decryptionWorker: state.decryptionWorker,
		resourceFetcher: state.resourceFetcher,
	};
})(SideMenuContentComponent);

module.exports = { SideMenuContent };
