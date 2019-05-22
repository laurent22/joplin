const React = require('react'); const Component = React.Component;
const { TouchableOpacity , Button, Text, Image, StyleSheet, ScrollView, View } = require('react-native');
const { connect } = require('react-redux');
const Icon = require('react-native-vector-icons/Ionicons').default;
const Tag = require('lib/models/Tag.js');
const Note = require('lib/models/Note.js');
const Folder = require('lib/models/Folder.js');
const Setting = require('lib/models/Setting.js');
const { FoldersScreenUtils } = require('lib/folders-screen-utils.js');
const { Synchronizer } = require('lib/synchronizer.js');
const { reg } = require('lib/registry.js');
const { _ } = require('lib/locale.js');
const { globalStyle, themeStyle } = require('lib/components/global-style.js');
const shared = require('lib/components/shared/side-menu-shared.js');

class SideMenuContentComponent extends Component {

	constructor() {
		super();
		this.state = { syncReportText: '',
			//width: 0,
		};
		this.styles_ = {};

		this.tagButton_press = this.tagButton_press.bind(this);
	}

	styles() {
		const theme = themeStyle(this.props.theme);

		if (this.styles_[this.props.theme]) return this.styles_[this.props.theme];
		this.styles_ = {};

		let styles = {
			menu: {
				flex: 1,
				backgroundColor: theme.backgroundColor
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
			},
		};

		styles.folderButton = Object.assign({}, styles.button);
		styles.folderButton.paddingLeft = 0;
		styles.folderButtonText = Object.assign({}, styles.buttonText);
		styles.folderButtonSelected = Object.assign({}, styles.folderButton);
		styles.folderButtonSelected.backgroundColor = theme.selectedColor;
		styles.folderIcon = Object.assign({}, theme.icon);
		styles.folderIcon.color = theme.colorFaded;//'#0072d5';
		styles.folderIcon.paddingTop = 3;

		styles.sideButton = Object.assign({}, styles.button);
		styles.sideButtonText = Object.assign({}, styles.buttonText);

		this.styles_[this.props.theme] = StyleSheet.create(styles);
		return this.styles_[this.props.theme];
	}

	folder_press(folder) {
		this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folder.id,
		});
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

	async synchronize_press() {
		const actionDone = await shared.synchronize_press(this);
		if (actionDone === 'auth') this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
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
		if (selected) folderButtonStyle.backgroundColor = theme.selectedColor;
		folderButtonStyle.paddingLeft = depth * 10;

		const iconWrapperStyle = { paddingLeft: 10, paddingRight: 10 };
		if (selected) iconWrapperStyle.backgroundColor = theme.selectedColor;

		const iconName = this.props.collapsedFolderIds.indexOf(folder.id) >= 0 ? 'md-arrow-dropdown' : 'md-arrow-dropup';
		const iconComp = <Icon name={iconName} style={this.styles().folderIcon} />

		const iconWrapper = !hasChildren ? null : (
			<TouchableOpacity style={iconWrapperStyle} folderid={folder.id} onPress={() => { if (hasChildren) this.folder_togglePress(folder) }}>
				{ iconComp }
			</TouchableOpacity>
		);

		return (
			<View key={folder.id} style={{ flex: 1, flexDirection: 'row' }}>
				<TouchableOpacity style={{ flex: 1 }} onPress={() => { this.folder_press(folder) }}>
					<View style={folderButtonStyle}>
						<Text numberOfLines={1} style={this.styles().folderButtonText}>{Folder.displayTitle(folder)}</Text>
					</View>
				</TouchableOpacity>
				{ iconWrapper }
			</View>
		);
	}

	synchronizeButton(state) {
		const theme = themeStyle(this.props.theme);
		
		const title = state == 'sync' ? _('Synchronise') : _('Cancel synchronisation');
		const iconComp = state == 'sync' ? <Icon name='md-sync' style={theme.icon} /> : <Icon name='md-close' style={theme.icon} />;

		return (
			<TouchableOpacity key={'synchronize_button'} onPress={() => { this.synchronize_press() }}>
				<View style={this.styles().sideButton}>
					{ iconComp }
					<Text style={this.styles().sideButtonText}>{title}</Text>
				</View>
			</TouchableOpacity>
		);
	}

	tagButton() {
		const theme = themeStyle(this.props.theme);

		return (
			<TouchableOpacity key={'tag_button'} onPress={this.tagButton_press}>
				<View style={this.styles().sideButton}>
					<Icon name='md-pricetag' style={theme.icon} />
					<Text style={this.styles().sideButtonText}>Tags</Text>
				</View>
			</TouchableOpacity>
		);
	}

	makeDivider(key) {
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: globalStyle.dividerColor }} key={key}></View>
	}

	render() {
		let items = [];

		const theme = themeStyle(this.props.theme);

		// HACK: inner height of ScrollView doesn't appear to be calculated correctly when
		// using padding. So instead creating blank elements for padding bottom and top.
		items.push(<View style={{ height: globalStyle.marginTop }} key='bottom_top_hack'/>);

		if (this.props.folders.length) {
			const result = shared.renderFolders(this.props, this.folderItem.bind(this));
			const folderItems = result.items;
			items = items.concat(folderItems);
		}

		items.push(this.makeDivider('divider_1'));
		
		items.push(this.tagButton());

		items.push(this.makeDivider('divider_tag_bottom'));

		let lines = Synchronizer.reportToLines(this.props.syncReport);
		const syncReportText = lines.join("\n");

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
		// if (fullReport.length) fullReport.push('');
		if (resourceFetcherText) fullReport.push(resourceFetcherText);
		if (decryptionReportText) fullReport.push(decryptionReportText);

		while (fullReport.length < 12) fullReport.push(''); // Add blank lines so that height of report text is fixed and doesn't affect scrolling

		items.push(this.synchronizeButton(this.props.syncStarted ? 'cancel' : 'sync'));

		items.push(<Text key='sync_report' style={this.styles().syncStatus}>{fullReport.join('\n')}</Text>);

		items.push(<View style={{ height: globalStyle.marginBottom }} key='bottom_padding_hack'/>);

		let style = {
			flex:1,
			borderRightWidth: 1,
			borderRightColor: globalStyle.dividerColor,
			backgroundColor: theme.backgroundColor,
		};

		return (
			<View style={style}>
				<View style={{flex:1, opacity: this.props.opacity}}>
					<ScrollView scrollsToTop={false} style={this.styles().menu}>
						{ items }
					</ScrollView>
				</View>
			</View>
		);
	}
};

const SideMenuContent = connect(
	(state) => {
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
	}
)(SideMenuContentComponent)

module.exports = { SideMenuContent };