import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { StyleSheet, TextStyle, TouchableOpacity, View } from 'react-native';
import { FolderEntity, FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import { themeStyle } from '../global-style';
import Icon from '../Icon';
import shim from '@joplin/lib/shim';
import Folder from '@joplin/lib/models/Folder';
import getTrashFolderId from '@joplin/lib/services/trash/getTrashFolderId';
import { TouchableRipple, Text } from 'react-native-paper';
import { _ } from '@joplin/lib/locale';
import useOnLongPressProps from '../../utils/hooks/useOnLongPressProps';
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
			buttonWrapper: { flex: 1, flexDirection: 'row' },
			folderButton: {
				flex: 1,
				flexDirection: 'row',
				flexBasis: 'auto',
				height: 52,
				alignItems: 'center',
				paddingRight: theme.marginRight,

				backgroundColor: props.selected ? theme.selectedColor : undefined,
				paddingLeft: props.depth * theme.marginSmall + theme.marginLeft,
			},
			iconWrapper: {
				paddingLeft: theme.margin,
				paddingRight: theme.margin,
				justifyContent: 'center',
				backgroundColor: props.selected ? theme.selectedColor : undefined,
			},
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

			folderButtonText: {
				...theme.normalText,
				paddingLeft: props.depth === 0 ? theme.marginSmall : theme.marginExtraSmall,
			},
			icon: {
				color: theme.color,
			},
		});
	}, [props.selected, props.depth, props.themeId]);

	const collapsed = props.collapsed;
	const toggleIcon = <Icon
		name={collapsed ? 'ionicon chevron-down' : 'ionicon chevron-up'}
		style={styles.folderToggleIcon}
		accessibilityLabel={null}
	/>;

	const onTogglePress = useCallback(() => {
		props.onTogglePress(props.folder);
	}, [props.folder, props.onTogglePress]);

	const toggleButton = !props.hasChildren ? null : (
		<TouchableOpacity
			style={styles.iconWrapper}
			onPress={onTogglePress}
			accessibilityLabel={_('Expand %s', props.folder.title)}

			aria-pressed={!collapsed}
			accessibilityState={{ checked: !collapsed }}
			// The togglebutton role is only supported on Android and iOS.
			// On web, the button role with aria-pressed creates a togglebutton.
			accessibilityRole={shim.mobilePlatform() === 'web' ? 'button' : 'togglebutton'}
		>
			{toggleIcon}
		</TouchableOpacity>
	);

	const folderIcon = Folder.unserializeIcon(props.folder.icon);

	const renderFolderIcon = (folderId: string, folderIcon: FolderIcon) => {
		if (!folderIcon) {
			if (folderId === getTrashFolderId()) {
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
			} else {
				return null;
			}
		}

		return <SidebarIcon
			style={styles.icon}
			icon={folderIcon}
		/>;
	};

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
	// React Native doesn't seem to include an equivalent to web's aria-level.
	// To allow screen reader users to determine whether a notebook is a subnotebook or not,
	// depth is specified with an accessibilityLabel:
	const folderDepthDescription = props.depth > 0 ? _('(level %d)', props.depth) : '';
	const accessibilityLabel = `${folderTitle}  ${folderDepthDescription}`.trim();
	const isConflictFolder = props.folder.id === Folder.conflictFolderId();
	const textStyle = useMemo(() => {
		const result: TextStyle[] = [styles.folderButtonText];
		if (isConflictFolder) {
			result.push(styles.conflictFolderButtonText);
			if (props.selected) {
				result.push(styles.conflictFolderButtonSelectedText);
			}
		}
		return result;
	}, [styles, props.selected, isConflictFolder]);

	return (
		<View key={props.folder.id} style={styles.buttonWrapper}>
			<TouchableRipple
				style={{ flex: 1, flexBasis: 'auto' }}
				onPress={onPress}
				{...longPressProps}
				accessibilityHint={_('Opens notebook')}
				accessibilityState={{ selected: props.selected }}
				aria-current={props.selected}
				role='button'
			>
				<View style={styles.folderButton}>
					{renderFolderIcon(props.folder.id, folderIcon)}
					<Text
						numberOfLines={1}
						style={textStyle}
						accessibilityLabel={accessibilityLabel}
					>
						{folderTitle}
					</Text>
				</View>
			</TouchableRipple>
			{toggleButton}
		</View>
	);
};

export default FolderItem;
