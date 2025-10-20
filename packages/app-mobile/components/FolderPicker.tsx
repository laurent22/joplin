import * as React from 'react';
import { FunctionComponent, ReactElement, useCallback, useContext } from 'react';
import { _ } from '@joplin/lib/locale';
import Folder, { FolderEntityWithChildren } from '@joplin/lib/models/Folder';
import { themeStyle } from './global-style';
import Dropdown, { DropdownListItem, OnValueChangedListener } from './Dropdown';
import { FolderEntity } from '@joplin/lib/services/database/types';
import { View } from 'react-native';
import { Button } from 'react-native-paper';
import { DialogContext } from './DialogManager';

interface FolderPickerProps {
	disabled?: boolean;
	selectedFolderId?: string;
	onValueChange?: OnValueChangedListener;
	mustSelect?: boolean;
	showRootOption?: boolean; // New prop to control when to show the 'root' option
	folders: FolderEntity[];
	placeholder?: string;
	darkText?: boolean;
	themeId?: number;
	coverableChildrenRight?: ReactElement|ReactElement[];
	onNewFolder?: (title: string)=> void;
}


const FolderPicker: FunctionComponent<FolderPickerProps> = ({
	disabled,
	selectedFolderId,
	onValueChange,
	mustSelect,
	showRootOption = false, // Default to false for backward compatibility
	folders,
	placeholder,
	darkText,
	coverableChildrenRight,
	onNewFolder,
	themeId,
}) => {
	const theme = themeStyle(themeId);

	const addFolderChildren = (
		folders: FolderEntityWithChildren[], pickerItems: DropdownListItem[], indent: number,
	) => {
		folders.sort((a, b) => {
			const aTitle = a && a.title ? a.title : '';
			const bTitle = b && b.title ? b.title : '';
			return aTitle.toLowerCase() < bTitle.toLowerCase() ? -1 : +1;
		});

		for (let i = 0; i < folders.length; i++) {
			const f = folders[i];
			const icon = Folder.unserializeIcon(f.icon);
			const iconString = icon ? `${icon.emoji} ` : '';
			pickerItems.push({ label: `${iconString + Folder.displayTitle(f)}`, depth: indent, value: f.id });
			pickerItems = addFolderChildren(f.children, pickerItems, indent + 1);
		}

		return pickerItems;
	};

	const titlePickerItems = (mustSelect: boolean, showRootOption: boolean) => {
		const folderList = folders.filter(f => f.id !== Folder.conflictFolderId());
		let output: DropdownListItem[] = [];
		if (mustSelect) {
			output.push({ label: placeholder || _('Move to notebook...'), value: '' });
			
			// Add option for creating top-level notebooks when showRootOption is true
			if (showRootOption) {
				output.push({ label: _('None (create top-level notebook)'), value: 'root' });
			}
		}
		const folderTree = Folder.buildTree(folderList);
		output = addFolderChildren(folderTree, output, 0);
		return output;
	};

	const dialogs = useContext(DialogContext);
	const onNewFolderPress = useCallback(async () => {
		const title = await dialogs.promptForText(_('New notebook title'));
		if (title !== null) {
			onNewFolder(title);
		}
	}, [dialogs, onNewFolder]);

	const dropdown = (
		<Dropdown
			items={titlePickerItems(!!mustSelect, showRootOption)}
			accessibilityHint={_('Selects a notebook')}
			disabled={disabled}
			labelTransform="trim"
			selectedValue={selectedFolderId || ''}
			coverableChildrenRight={coverableChildrenRight}
			itemListStyle={{
				backgroundColor: theme.backgroundColor,
			}}
			headerStyle={{
				color: darkText ? theme.colorFaded : theme.colorBright2,
				fontSize: theme.fontSize,
				opacity: disabled ? theme.disabledOpacity : 1,
			}}
			itemStyle={{
				color: theme.color,
				fontSize: theme.fontSize,
			}}
			onValueChange={(folderId) => {
				if (onValueChange) {
					onValueChange(folderId);
				}
			}}
		/>
	);

	if (onNewFolder) {
		return <View style={{ flexDirection: 'column', flex: 1 }}>
			{dropdown}
			<Button
				style={{ alignSelf: 'flex-end' }}
				icon='plus'
				onPress={onNewFolderPress}
			>{_('Create new notebook')}</Button>
		</View>;
	} else {
		return dropdown;
	}
};

export default FolderPicker;