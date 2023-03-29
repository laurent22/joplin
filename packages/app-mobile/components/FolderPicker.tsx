const React = require('react');

import { FunctionComponent } from 'react';
import { _ } from '@joplin/lib/locale';
import Setting from '@joplin/lib/models/Setting';
import Folder, { FolderEntityWithChildren } from '@joplin/lib/models/Folder';
const { themeStyle } = require('./global-style.js');
import Dropdown, { DropdownListItem, OnValueChangedListener } from './Dropdown';
import { FolderEntity } from '@joplin/lib/services/database/types';

interface FolderPickerProps {
	disabled?: boolean;
	selectedFolderId?: string;
	onValueChange?: OnValueChangedListener;
	mustSelect?: boolean;
	folders: FolderEntity[];
	placeholder?: string;
	darkText?: boolean;
	themeId?: string;
}


const FolderPicker: FunctionComponent<FolderPickerProps> = ({
	disabled,
	selectedFolderId,
	onValueChange,
	mustSelect,
	folders,
	placeholder,
	darkText,
	themeId = Setting.value('theme'),
}) => {
	const theme = themeStyle(themeId);

	const addFolderChildren = (
		folders: FolderEntityWithChildren[], pickerItems: DropdownListItem[], indent: number
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
			pickerItems.push({ label: `${'      '.repeat(indent)} ${iconString + Folder.displayTitle(f)}`, value: f.id });
			pickerItems = addFolderChildren(f.children, pickerItems, indent + 1);
		}

		return pickerItems;
	};

	const titlePickerItems = (mustSelect: boolean) => {
		const folderList = folders.filter(f => f.id !== Folder.conflictFolderId());
		let output = [];
		if (mustSelect) output.push({ label: placeholder || _('Move to notebook...'), value: null });
		const folderTree = Folder.buildTree(folderList);
		output = addFolderChildren(folderTree, output, 0);
		return output;
	};

	return (
		<Dropdown
			items={titlePickerItems(!!mustSelect)}
			disabled={disabled}
			labelTransform="trim"
			selectedValue={selectedFolderId || null}
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
};

export default FolderPicker;
