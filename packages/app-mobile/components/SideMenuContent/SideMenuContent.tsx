import * as React from 'react';
import { useMemo, useEffect, useCallback, useContext, useState } from 'react';
import { Easing, Animated, TouchableOpacity, Text, StyleSheet, ScrollView, View } from 'react-native';
import { Dispatch } from 'redux';
import { connect } from 'react-redux';
import Folder from '@joplin/lib/models/Folder';
import Synchronizer, { type ProgressReport } from '@joplin/lib/Synchronizer';
import NavService from '@joplin/lib/services/NavService';
import { _ } from '@joplin/lib/locale';
import { themeStyle } from '../global-style';
import { buildFolderTree, isFolderSelected, RenderFolderItemEvent, renderFolders } from '@joplin/lib/components/shared/side-menu-shared';
import { FolderEntity, FolderIconType } from '@joplin/lib/services/database/types';
import { AppState } from '../../utils/types';
import Setting from '@joplin/lib/models/Setting';
import { reg } from '@joplin/lib/registry';
import { ProfileConfig } from '@joplin/lib/services/profileConfig/types';
import { getTrashFolderId } from '@joplin/lib/services/trash';
import restoreItems from '@joplin/lib/services/trash/restoreItems';
import emptyTrash from '@joplin/lib/services/trash/emptyTrash';
import { ModelType } from '@joplin/lib/BaseModel';
import { DialogContext } from '../DialogManager';
import { TextStyle, ViewStyle } from 'react-native';
import { StateDecryptionWorker, StateResourceFetcher } from '@joplin/lib/reducer';
import getConflictFolderId from '@joplin/lib/models/utils/getConflictFolderId';
import { substrWithEllipsis } from '@joplin/lib/string-utils';
import BottomDrawerMenu, { MenuOption, MenuOptionStyle } from '../BottomDrawerMenu';
import { MenuAlignment } from '../BottomDrawer';
import FolderItem from './FolderItem';
import { ALL_NOTES_FILTER_ID } from '@joplin/lib/reserved-ids';
import SidebarIcon from './SidebarIcon';

interface Props {
	syncStarted: boolean;
	themeId: number;
	dispatch: Dispatch;
	collapsedFolderIds: string[];
	syncReport: ProgressReport;
	decryptionWorker: StateDecryptionWorker;
	resourceFetcher: StateResourceFetcher;
	syncOnlyOverWifi: boolean;
	isOnMobileData: boolean;
	notesParentType: string;
	folders: FolderEntity[];
	profileConfig: ProfileConfig;
	inboxJopId: string;
	selectedFolderIds: string[];
	selectedSmartFilterId: string;
}

const syncIconRotationValue = new Animated.Value(0);

const syncIconRotation = syncIconRotationValue.interpolate({
	inputRange: [0, 1],
	outputRange: ['0deg', '360deg'],
});

let syncIconAnimation: Animated.CompositeAnimation|null = null;

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);

		const buttonStyle: ViewStyle = {
			flex: 1,
			flexDirection: 'row',
			flexBasis: 'auto',
			height: 52,
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
		const sidebarIconStyle = {
			color: theme.color,
		};
		const folderButtonStyle: ViewStyle = {
			...buttonStyle,
			paddingLeft: 0,
		};
		const sideButtonStyle: ViewStyle = {
			...buttonStyle,
			flex: 0,
		};
		const folderButtonTextStyle: ViewStyle = {
			...buttonTextStyle,
			paddingLeft: 0,
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
			folderButtonText: folderButtonTextStyle,
			folderButtonSelected: {
				...folderButtonStyle,
				backgroundColor: theme.selectedColor,
			},
			sideButton: sideButtonStyle,
			sideButtonText: {
				...buttonTextStyle,
			},
		});

		return styles;
	}, [themeId]);
};


const SideMenuContentComponent = (props: Props) => {
	const alwaysShowFolderIcons = true;
	const styles_ = useStyles(props.themeId);

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

	const dialogs = useContext(DialogContext);

	const folder_press = (folder: FolderEntity) => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		const key = folder.id === ALL_NOTES_FILTER_ID ? 'smartFilterId' : 'folderId';
		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			[key]: folder.id,
		});
	};

	const [folderMenuVisible, setFolderMenuVisible] = useState(false);
	const [folderMenuTitle, setFolderMenuTitle] = useState('');
	const [folderMenuOptions, setFolderMenuOptions] = useState<MenuOption[]>([]);
	const folder_longPress = async (folderOrAll: FolderEntity | string) => {
		if (folderOrAll === 'all') return;

		const folder = folderOrAll as FolderEntity;

		const menuItems: MenuOption[] = [];

		if (folder && folder.id === getConflictFolderId()) return;
		if (folder && folder.id === ALL_NOTES_FILTER_ID) return;

		if (folder && folder.id === getTrashFolderId()) {
			menuItems.push({
				title: _('Empty trash'),
				icon: 'material delete-outline',
				onPress: async () => {
					dialogs.prompt('', _('This will permanently delete all items in the trash. Continue?'), [
						{
							text: _('Cancel'),
							onPress: () => { },
							style: 'cancel',
						},
						{
							text: _('Empty trash'),
							onPress: async () => {
								await emptyTrash();
							},
						},
					]);
				},
				style: MenuOptionStyle.Destructive,
			});

		} else if (folder && !!folder.deleted_time) {
			menuItems.push({
				title: _('Restore'),
				icon: 'material delete-off-outline',
				onPress: async () => {
					await restoreItems(ModelType.Folder, [folder.id]);
				},
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
							text: _('Cancel'),
							onPress: () => { },
							style: 'cancel',
						},
						{
							text: _('OK'),
							onPress: () => {
								void Folder.delete(folder.id, { toTrash: true, sourceDescription: 'side-menu-content (long-press)' });
							},
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

			const deleteButton: MenuOption = {
				title: _('Delete'),
				onPress: generateFolderDeletion,
				icon: 'material delete-outline',
				style: MenuOptionStyle.Destructive,
			};
			const editButton: MenuOption = {
				title: _('Edit'),
				icon: 'material file-edit-outline',
				onPress: () => {
					props.dispatch({ type: 'SIDE_MENU_CLOSE' });

					props.dispatch({
						type: 'NAV_GO',
						routeName: 'Folder',
						folderId: folder.id,
					});
				},
			};

			menuItems.push(editButton, deleteButton);
		}

		setFolderMenuOptions(menuItems);
		setFolderMenuTitle(_('Notebook: %s', folder.title));
		setFolderMenuVisible(true);
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
				type: 'SYNC_WIZARD_VISIBLE_CHANGE',
				visible: true,
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


	const renderFolderItem = ({ folder, hasChildren, depth }: RenderFolderItemEvent) => {
		let selected;
		if (props.notesParentType === 'Folder') {
			selected = isFolderSelected(folder, {
				selectedFolderIds: props.selectedFolderIds,
				notesParentType: props.notesParentType,
			});
		} else {
			selected = props.notesParentType === 'SmartFilter' && props.selectedSmartFilterId === folder.id;
		}

		return <FolderItem
			key={`folder-item-${folder.id}`}
			themeId={props.themeId}
			hasChildren={hasChildren}
			depth={depth}
			collapsed={props.collapsedFolderIds.includes(folder.id)}
			selected={selected}
			folder={folder}
			alwaysShowFolderIcons={alwaysShowFolderIcons}
			onPress={folder_press}
			onLongPress={folder_longPress}
			onTogglePress={folder_togglePress}
		/>;
	};

	type SidebarButtonOptions = {
		onPress?: ()=> void;
		isHeader?: boolean;
	};
	const renderSidebarButton = (
		key: string,
		title: string,
		iconName: string,
		{ onPress = null, isHeader = false }: SidebarButtonOptions = {},
	) => {
		let icon = <SidebarIcon icon={`ionicon ${iconName}`} style={styles_.sidebarIcon} />;

		if (key === 'synchronize_button') {
			icon = <Animated.View style={{ transform: [{ rotate: syncIconRotation }] }}>{icon}</Animated.View>;
		}

		const content = (
			<View key={key} style={styles_.sideButton}>
				{icon}
				<Text
					style={styles_.sideButtonText}
					accessibilityRole={isHeader ? 'header' : undefined}
				>{title}</Text>
			</View>
		);

		if (!onPress) return content;

		return (
			<TouchableOpacity key={key} onPress={onPress} accessibilityRole='button'>
				{content}
			</TouchableOpacity>
		);
	};

	const makeDivider = (key: string) => {
		const theme = themeStyle(props.themeId);
		return <View role='separator' style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: theme.dividerColor }} key={key}></View>;
	};

	const renderBottomPanel = () => {
		const theme = themeStyle(props.themeId);

		const items = [];

		items.push(makeDivider('divider_1'));

		items.push(renderSidebarButton('newFolder_button', _('New Notebook'), 'folder-open-outline', { onPress: newFolderButton_press }));

		items.push(renderSidebarButton('tag_button', _('Tags'), 'pricetag-outline', { onPress: tagButton_press }));

		if (props.profileConfig && props.profileConfig.profiles.length > 1) {
			items.push(renderSidebarButton('switchProfile_button', _('Switch profile'), 'people-circle-outline', { onPress: switchProfileButton_press }));
		}

		items.push(renderSidebarButton('config_button', _('Configuration'), 'settings-outline', { onPress: configButton_press }));

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

		items.push(renderSidebarButton('synchronize_button', !props.syncStarted ? _('Synchronise') : _('Cancel'), 'sync', { onPress: synchronize_press }));

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

	items.push(
		renderFolderItem({
			folder: {
				title: _('All notes'),
				icon: JSON.stringify({ type: FolderIconType.FontAwesome, name: 'ionicon document-outline' }),
				id: ALL_NOTES_FILTER_ID,
			},
			hasChildren: false,
			depth: 0,
			indexInParent: 0,
		}),
	);

	items.push(makeDivider('divider_all'));

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
			<BottomDrawerMenu
				visible={folderMenuVisible}
				onDismiss={() => setFolderMenuVisible(false)}
				themeId={props.themeId}
				alignment={MenuAlignment.Center}
				title={folderMenuTitle}
				options={folderMenuOptions}
			/>
		</View>
	);
};

export default connect((state: AppState) => {
	return {
		folders: state.folders,
		syncStarted: state.syncStarted,
		syncReport: state.syncReport,
		selectedFolderIds: state.selectedFolderIds,
		selectedSmartFilterId: state.selectedSmartFilterId,
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
