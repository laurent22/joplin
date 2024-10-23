import * as React from 'react';
import { useMemo, useEffect, useCallback, useContext } from 'react';
import { Easing, Animated, TouchableOpacity, Text, StyleSheet, ScrollView, View, Image, ImageStyle } from 'react-native';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
const IonIcon = require('react-native-vector-icons/Ionicons').default;
import Icon from './Icon';
import Folder from '@joplin/lib/models/Folder';
import Synchronizer from '@joplin/lib/Synchronizer';
import NavService from '@joplin/lib/services/NavService';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from './global-style';
import { buildFolderTree, isFolderSelected, renderFolders } from '@joplin/lib/components/shared/side-menu-shared';
import { FolderEntity, FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import { AppState } from '../utils/types';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';
import { ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import { getTrashFolderIcon, getTrashFolderId } from '@joplin/lib/services/trash';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import emptyTrash from '@joplin/lib/services/trash/emptyTrash';
import { ModelType } from '@joplin/lib/BaseModel';
import { DialogContext } from './DialogManager';
import { TextStyle, ViewStyle } from 'react-native';
import { StateDecryptionWorker, StateResourceFetcher } from '@joplin/lib/reducer';
const { TouchableRipple } = require('react-native-paper');
const { substrWithEllipsis } = require('@joplin/lib/string-utils');

interface Props {
	syncStarted: boolean;
	themeId: number;
	dispatch: Dispatch;
	collapsedFolderIds: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	syncReport: any;
	decryptionWorker: StateDecryptionWorker;
	resourceFetcher: StateResourceFetcher;
	syncOnlyOverWifi: boolean;
	isOnMobileData: boolean;
	notesParentType: string;
	folders: FolderEntity[];
	profileConfig: ProfileConfig;
	inboxJopId: string;
	selectedFolderId: string;
	selectedTagId: string;
}

const syncIconRotationValue = new Animated.Value(0);

const syncIconRotation = syncIconRotationValue.interpolate({
	inputRange: [0, 1],
	outputRange: ['0deg', '360deg'],
});

const folderIconRightMargin = 10;

let syncIconAnimation: Animated.CompositeAnimation|null = null;

const SideMenuContentComponent = (props: Props) => {
	const alwaysShowFolderIcons = useMemo(() => Folder.shouldShowFolderIcons(props.folders), [props.folders]);

	const styles_ = useMemo(() => {
		const theme = themeStyle(props.themeId);

		const buttonStyle: ViewStyle = {
			flex: 1,
			flexDirection: 'row',
			flexBasis: 'auto',
			height: 36,
			alignItems: 'center',
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
		};
		const buttonTextStyle: TextStyle = {
			flex: 1,
			color: theme.color,
			paddingLeft: 10,
			fontSize: theme.fontSize,
		};
		const sidebarIconStyle: TextStyle = {
			fontSize: 22,
			color: theme.color,
			width: 26,
			textAlign: 'center',
			textAlignVertical: 'center',
		};
		const folderIconBase: ViewStyle&ImageStyle = {
			marginRight: folderIconRightMargin,
			width: 27,
		};
		const folderButtonStyle: ViewStyle = {
			...buttonStyle,
			paddingLeft: 0,
		};
		const sideButtonStyle: ViewStyle = {
			...buttonStyle,
			flex: 0,
		};

		const styles = StyleSheet.create({
			menu: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			button: buttonStyle,
			buttonText: buttonTextStyle,
			syncStatus: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				color: theme.colorFaded,
				fontSize: theme.fontSizeSmaller,
				flex: 0,
			},
			sidebarIcon: sidebarIconStyle,
			folderButton: folderButtonStyle,
			folderButtonText: {
				...buttonTextStyle,
				paddingLeft: 0,
			},
			folderButtonSelected: {
				...folderButtonStyle,
				backgroundColor: theme.selectedColor,
			},
			folderToggleIcon: {
				...theme.icon,
				color: theme.colorFaded,
				paddingTop: 3,
			},
			sideButton: sideButtonStyle,
			sideButtonSelected: {
				...sideButtonStyle,
			},
			sideButtonText: {
				...buttonTextStyle,
			},
			folderBaseIcon: {
				...sidebarIconStyle,
				...folderIconBase,
			},
			folderEmojiIcon: {
				...sidebarIconStyle,
				...folderIconBase,
				textAlign: undefined,
				fontSize: theme.fontSize,
			},
			folderImageIcon: {
				...folderIconBase,
				height: 20,
				resizeMode: 'contain',
			},
		});

		return styles;
	}, [props.themeId]);

	useEffect(() => {
		if (props.syncStarted) {
			syncIconAnimation = Animated.loop(
				Animated.timing(syncIconRotationValue, {
					toValue: 1,
					duration: 3000,
					easing: Easing.linear,
					useNativeDriver: false,
				}),
			);

			syncIconAnimation.start();
		} else {
			if (syncIconAnimation) syncIconAnimation.stop();
			syncIconAnimation = null;
		}
	}, [props.syncStarted]);

	const folder_press = (folder: FolderEntity) => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folder.id,
		});
	};

	const dialogs = useContext(DialogContext);

	const folder_longPress = async (folderOrAll: FolderEntity | string) => {
		if (folderOrAll === 'all') return;

		const folder = folderOrAll as FolderEntity;

		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const menuItems: any[] = [];

		if (folder && folder.id === getTrashFolderId()) {
			menuItems.push({
				text: _('Empty trash'),
				onPress: async () => {
					dialogs.prompt('', _('This will permanently delete all items in the trash. Continue?'), [
						{
							text: _('Empty trash'),
							onPress: async () => {
								await emptyTrash();
							},
						},
						{
							text: _('Cancel'),
							onPress: () => { },
							style: 'cancel',
						},
					]);
				},
				style: 'destructive',
			});

		} else if (folder && !!folder.deleted_time) {
			menuItems.push({
				text: _('Restore'),
				onPress: async () => {
					await restoreItems(ModelType.Folder, [folder.id]);
				},
				style: 'destructive',
			});

			// Alert.alert(
			// 	'',
			// 	_('Notebook: %s', folder.title),
			// 	[
			// 		{
			// 			text: _('Restore'),
			// 			onPress: async () => {
			// 				await restoreItems(ModelType.Folder, [folder.id]);
			// 			},
			// 			style: 'destructive',
			// 		},
			// 		{
			// 			text: _('Cancel'),
			// 			onPress: () => {},
			// 			style: 'cancel',
			// 		},
			// 	],
			// 	{
			// 		cancelable: false,
			// 	},
			// );
		} else {
			const generateFolderDeletion = () => {
				const folderDeletion = (message: string) => {
					dialogs.prompt('', message, [
						{
							text: _('OK'),
							onPress: () => {
								void Folder.delete(folder.id, { toTrash: true, sourceDescription: 'side-menu-content (long-press)' });
							},
						},
						{
							text: _('Cancel'),
							onPress: () => { },
							style: 'cancel',
						},
					]);
				};

				if (folder.id === props.inboxJopId) {
					return folderDeletion(
						_('Delete the Inbox notebook?\n\nIf you delete the inbox notebook, any email that\'s recently been sent to it may be lost.'),
					);
				}
				return folderDeletion(_('Move notebook "%s" to the trash?\n\nAll notes and sub-notebooks within this notebook will also be moved to the trash.', substrWithEllipsis(folder.title, 0, 32)));
			};

			menuItems.push({
				text: _('Edit'),
				onPress: () => {
					props.dispatch({ type: 'SIDE_MENU_CLOSE' });

					props.dispatch({
						type: 'NAV_GO',
						routeName: 'Folder',
						folderId: folder.id,
					});
				},
			});

			menuItems.push({
				text: _('Delete'),
				onPress: generateFolderDeletion,
				style: 'destructive',
			});
		}

		menuItems.push({
			text: _('Cancel'),
			onPress: () => {},
			style: 'cancel',
		});

		dialogs.prompt(
			'',
			_('Notebook: %s', folder.title),
			menuItems,
		);
	};

	const folder_togglePress = (folder: FolderEntity) => {
		props.dispatch({
			type: 'FOLDER_TOGGLE',
			id: folder.id,
		});
	};

	const tagButton_press = () => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Tags',
		});
	};

	const switchProfileButton_press = () => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'ProfileSwitcher',
		});
	};

	const configButton_press = () => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });
		void NavService.go('Config');
	};

	const allNotesButton_press = () => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			smartFilterId: 'c3176726992c11e9ac940492261af972',
		});
	};

	const newFolderButton_press = () => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Folder',
			folderId: null,
		});
	};

	const performSync = useCallback(async () => {
		const action = props.syncStarted ? 'cancel' : 'start';

		if (!Setting.value('sync.target')) {
			props.dispatch({
				type: 'SIDE_MENU_CLOSE',
			});

			props.dispatch({
				type: 'NAV_GO',
				routeName: 'Config',
				sectionName: 'sync',
			});

			return 'init';
		}

		if (!(await reg.syncTarget().isAuthenticated())) {
			if (reg.syncTarget().authRouteName()) {
				props.dispatch({
					type: 'NAV_GO',
					routeName: reg.syncTarget().authRouteName(),
				});
				return 'auth';
			}

			reg.logger().error('Not authenticated with sync target - please check your credentials.');
			return 'error';
		}

		let sync = null;
		try {
			sync = await reg.syncTarget().synchronizer();
		} catch (error) {
			reg.logger().error('Could not initialise synchroniser: ');
			reg.logger().error(error);
			error.message = `Could not initialise synchroniser: ${error.message}`;
			props.dispatch({
				type: 'SYNC_REPORT_UPDATE',
				report: { errors: [error] },
			});
			return 'error';
		}

		if (action === 'cancel') {
			void sync.cancel();
			return 'cancel';
		} else {
			void reg.scheduleSync(0);
			return 'sync';
		}
	}, [props.syncStarted, props.dispatch]);

	const synchronize_press = useCallback(async () => {
		const actionDone = await performSync();
		if (actionDone === 'auth') props.dispatch({ type: 'SIDE_MENU_CLOSE' });
	}, [performSync, props.dispatch]);

	const renderFolderIcon = (folderId: string, folderIcon: FolderIcon) => {
		if (!folderIcon) {
			if (folderId === getTrashFolderId()) {
				folderIcon = getTrashFolderIcon(FolderIconType.Emoji);
			} else if (alwaysShowFolderIcons) {
				return <IonIcon name="folder-outline" style={styles_.folderBaseIcon} />;
			} else {
				return null;
			}
		}

		if (folderIcon.type === FolderIconType.Emoji) {
			return <Text style={styles_.folderEmojiIcon}>{folderIcon.emoji}</Text>;
		} else if (folderIcon.type === FolderIconType.DataUrl) {
			return <Image style={styles_.folderImageIcon} source={{ uri: folderIcon.dataUrl }}/>;
		} else if (folderIcon.type === FolderIconType.FontAwesome) {
			return <Icon style={styles_.folderBaseIcon} name={folderIcon.name} accessibilityLabel={''}/>;
		} else {
			throw new Error(`Unsupported folder icon type: ${folderIcon.type}`);
		}
	};

	const renderFolderItem = (folder: FolderEntity, hasChildren: boolean, depth: number) => {
		const theme = themeStyle(props.themeId);

		const folderButtonStyle: ViewStyle = {
			flex: 1,
			flexDirection: 'row',
			flexBasis: 'auto',
			height: 36,
			alignItems: 'center',
			paddingRight: theme.marginRight,
			paddingLeft: 10,
		};
		const selected = isFolderSelected(folder, { selectedFolderId: props.selectedFolderId, notesParentType: props.notesParentType });
		if (selected) folderButtonStyle.backgroundColor = theme.selectedColor;
		folderButtonStyle.paddingLeft = depth * 10 + theme.marginLeft;

		const iconWrapperStyle: ViewStyle = { paddingLeft: 10, paddingRight: 10 };
		if (selected) iconWrapperStyle.backgroundColor = theme.selectedColor;

		let iconWrapper = null;

		const collapsed = props.collapsedFolderIds.indexOf(folder.id) >= 0;
		const iconName = collapsed ? 'chevron-down' : 'chevron-up';
		const iconComp = <IonIcon name={iconName} style={styles_.folderToggleIcon} />;

		iconWrapper = !hasChildren ? null : (
			<TouchableOpacity
				style={iconWrapperStyle}
				onPress={() => {
					if (hasChildren) folder_togglePress(folder);
				}}

				accessibilityLabel={collapsed ? _('Expand') : _('Collapse')}
				accessibilityRole="togglebutton"
			>
				{iconComp}
			</TouchableOpacity>
		);

		const folderIcon = Folder.unserializeIcon(folder.icon);

		return (
			<View key={folder.id} style={{ flex: 1, flexDirection: 'row' }}>
				<TouchableRipple
					style={{ flex: 1, flexBasis: 'auto' }}
					onPress={() => {
						folder_press(folder);
					}}
					onLongPress={() => {
						void folder_longPress(folder);
					}}
					onContextMenu={(event: Event) => { // web only
						event.preventDefault();
						void folder_longPress(folder);
					}}
					role='button'
				>
					<View style={folderButtonStyle}>
						{renderFolderIcon(folder.id, folderIcon)}
						<Text numberOfLines={1} style={styles_.folderButtonText}>
							{Folder.displayTitle(folder)}
						</Text>
					</View>
				</TouchableRipple>
				{iconWrapper}
			</View>
		);
	};

	const renderSidebarButton = (key: string, title: string, iconName: string, onPressHandler: ()=> void = null, selected = false) => {
		let icon = <IonIcon name={iconName} style={styles_.sidebarIcon} aria-hidden={true} />;

		if (key === 'synchronize_button') {
			icon = <Animated.View style={{ transform: [{ rotate: syncIconRotation }] }}>{icon}</Animated.View>;
		}

		const content = (
			<View key={key} style={selected ? styles_.sideButtonSelected : styles_.sideButton}>
				{icon}
				<Text style={styles_.sideButtonText}>{title}</Text>
			</View>
		);

		if (!onPressHandler) return content;

		return (
			<TouchableOpacity key={key} onPress={onPressHandler} role='button'>
				{content}
			</TouchableOpacity>
		);
	};

	const makeDivider = (key: string) => {
		const theme = themeStyle(props.themeId);
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: theme.dividerColor }} key={key}></View>;
	};

	const renderBottomPanel = () => {
		const theme = themeStyle(props.themeId);

		const items = [];

		items.push(makeDivider('divider_1'));

		items.push(renderSidebarButton('newFolder_button', _('New Notebook'), 'folder-open', newFolderButton_press));

		items.push(renderSidebarButton('tag_button', _('Tags'), 'pricetag', tagButton_press));

		if (props.profileConfig && props.profileConfig.profiles.length > 1) {
			items.push(renderSidebarButton('switchProfile_button', _('Switch profile'), 'people-circle-outline', switchProfileButton_press));
		}

		items.push(renderSidebarButton('config_button', _('Configuration'), 'settings', configButton_press));

		items.push(makeDivider('divider_2'));

		const lines = Synchronizer.reportToLines(props.syncReport);
		const syncReportText = lines.join('\n');

		let decryptionReportText = '';
		if (props.decryptionWorker && props.decryptionWorker.state !== 'idle' && props.decryptionWorker.itemCount) {
			decryptionReportText = _('Decrypting items: %d/%d', props.decryptionWorker.itemIndex + 1, props.decryptionWorker.itemCount);
		}

		let resourceFetcherText = '';
		if (props.resourceFetcher && props.resourceFetcher.toFetchCount) {
			resourceFetcherText = _('Fetching resources: %d/%d', props.resourceFetcher.fetchingCount, props.resourceFetcher.toFetchCount);
		}

		const fullReport = [];
		if (syncReportText) fullReport.push(syncReportText);
		if (resourceFetcherText) fullReport.push(resourceFetcherText);
		if (decryptionReportText) fullReport.push(decryptionReportText);

		items.push(renderSidebarButton('synchronize_button', !props.syncStarted ? _('Synchronise') : _('Cancel'), 'sync', synchronize_press));

		if (fullReport.length) {
			items.push(
				<Text key="sync_report" style={styles_.syncStatus}>
					{fullReport.join('\n')}
				</Text>,
			);
		}

		if (props.syncOnlyOverWifi && props.isOnMobileData) {
			items.push(
				<Text key="net_info" style={styles_.syncStatus}>
					{ _('Mobile data - auto-sync disabled') }
				</Text>,
			);
		}

		return <View style={{ flex: 0, flexDirection: 'column', flexBasis: 'auto', paddingBottom: theme.marginBottom }}>{items}</View>;
	};

	let items = [];

	const theme = themeStyle(props.themeId);

	// HACK: inner height of ScrollView doesn't appear to be calculated correctly when
	// using padding. So instead creating blank elements for padding bottom and top.
	items.push(<View style={{ height: theme.marginTop }} key="bottom_top_hack" />);

	items.push(renderSidebarButton('all_notes', _('All notes'), 'document', allNotesButton_press, props.notesParentType === 'SmartFilter'));

	items.push(makeDivider('divider_all'));

	items.push(renderSidebarButton('folder_header', _('Notebooks'), 'folder'));

	const folderTree = useMemo(() => {
		return buildFolderTree(props.folders);
	}, [props.folders]);

	if (props.folders.length) {
		const result = renderFolders({
			folderTree,
			collapsedFolderIds: props.collapsedFolderIds,
		}, renderFolderItem);

		const folderItems = result.items;
		items = items.concat(folderItems);
	}

	const style = {
		flex: 1,
		borderRightWidth: 1,
		borderRightColor: theme.dividerColor,
		backgroundColor: theme.backgroundColor,
	};

	return (
		<View style={style}>
			<View style={{ flex: 1 }}>
				<ScrollView scrollsToTop={false} style={styles_.menu}>
					{items}
				</ScrollView>
				{renderBottomPanel()}
			</View>
		</View>
	);
};

export default connect((state: AppState) => {
	return {
		folders: state.folders,
		syncStarted: state.syncStarted,
		syncReport: state.syncReport,
		selectedFolderId: state.selectedFolderId,
		selectedTagId: state.selectedTagId,
		notesParentType: state.notesParentType,
		locale: state.settings.locale,
		themeId: state.settings.theme,
		collapsedFolderIds: state.collapsedFolderIds,
		decryptionWorker: state.decryptionWorker,
		resourceFetcher: state.resourceFetcher,
		isOnMobileData: state.isOnMobileData,
		syncOnlyOverWifi: state.settings['sync.mobileWifiOnly'],
		profileConfig: state.profileConfig,
		inboxJopId: state.settings['sync.10.inboxId'],
	};
})(SideMenuContentComponent);
