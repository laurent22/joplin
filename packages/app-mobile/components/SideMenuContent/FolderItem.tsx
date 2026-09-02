import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { FolderEntity, FolderIconType } from '@joplin/lib/services/database/types';
import { themeStyle } from '../global-style';
import Folder from '@joplin/lib/models/Folder';
import getTrashFolderId from '@joplin/lib/services/trash/getTrashFolderId';
import { _ } from '@joplin/lib/locale';
import useOnLongPressProps from '../../utils/hooks/useOnLongPressProps';
import SideMenuItem, { ToggleState } from './SideMenuItem';
import SidebarIcon from './SidebarIcon';

type FolderEventHandler = (folder: FolderEntity)=> void;
interface FolderItemProps {
	themeId: number;
	hasChildren: boolean;
	collapsed: boolean;
	folder: FolderEntity;
	selected: boolean;
	depth: number;
	alwaysShowFolderIcons: boolean;

	onPress: FolderEventHandler;
	onTogglePress: FolderEventHandler;
	onLongPress: FolderEventHandler;
}

const FolderItem: React.FC<FolderItemProps> = props => {
	const styles = useMemo(() => {
		const theme = themeStyle(props.themeId);

		return StyleSheet.create({
			conflictFolderButtonText: {
				color: theme.colorError,
			},
			conflictFolderButtonSelectedText: {
				color: theme.colorErrorSelected,
			},
			folderToggleIcon: {
				...theme.icon,
				fontSize: theme.fontSizeLarger,
				color: theme.color,
			},

			icon: {
				color: theme.color,
			},
		});
	}, [props.themeId]);

	const collapsed = props.collapsed;

	let folderIcon = Folder.unserializeIcon(props.folder.icon);
	if (!folderIcon) {
		if (props.folder.id === getTrashFolderId()) {
			folderIcon = {
				dataUrl: '',
				emoji: '',
				name: 'ionicon trash-outline',
				type: FolderIconType.FontAwesome,
			};
		} else if (props.alwaysShowFolderIcons) {
			folderIcon = {
				type: FolderIconType.FontAwesome,
				name: collapsed ? 'ionicon folder-outline' : 'ionicon folder-open-outline',
				emoji: '',
				dataUrl: '',
			};
		}
	}

	const onToggle = useCallback(() => {
		props.onTogglePress(props.folder);
	}, [props.folder, props.onTogglePress]);

	const onPress = useCallback(() => {
		props.onPress(props.folder);
	}, [props.folder, props.onPress]);

	const onLongPress = useCallback(() => {
		props.onLongPress(props.folder);
	}, [props.folder, props.onLongPress]);

	const longPressProps = useOnLongPressProps({
		onLongPress,
		actionDescription: _('Show notebook options'),
	});

	const folderTitle = Folder.displayTitle(props.folder);
	const isConflictFolder = props.folder.id === Folder.conflictFolderId();
	const textStyle = useMemo(() => {
		const result: TextStyle[] = [];
		if (isConflictFolder) {
			result.push(styles.conflictFolderButtonText);
			if (props.selected) {
				result.push(styles.conflictFolderButtonSelectedText);
			}
		}
		return result;
	}, [styles, props.selected, isConflictFolder]);
	let toggleState = ToggleState.Hidden;
	if (props.hasChildren) {
		toggleState = collapsed ? ToggleState.Collapsed : ToggleState.Expanded;
	}

	const currentProp = { 'aria-current': props.selected };
	return (
		<SideMenuItem
			icon={
				<SidebarIcon icon={folderIcon} style={styles.icon} />
			}
			text={folderTitle}
			textStyle={textStyle}
			selected={props.selected}
			depth={props.depth}
			touchableProps={{
				onPress: onPress,
				...longPressProps,
				...currentProp,
				accessibilityHint: _('Opens notebook'),
				accessibilityState: { selected: props.selected },
			}}
			toggleState={toggleState}
			onToggle={onToggle}
			themeId={props.themeId}
		/>
	);
};

export default FolderItem;
