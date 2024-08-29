import { FolderIcon, FolderIconType } from '../../../database/types';

const parseFolderIcon = (iconData: string): FolderIcon => {
	if (iconData.match(/^\s*\{/)) { // JSON
		try {
			return JSON.parse(iconData);
		} catch (_error) {
			return {
				type: FolderIconType.Emoji,
				emoji: '⚠️',
				name: '',
				dataUrl: '',
			};
		}
	} else if (iconData.startsWith('data:')) { // Data URI
		return {
			type: FolderIconType.DataUrl,
			emoji: '',
			name: '',
			dataUrl: iconData,
		};
	} else if (iconData.startsWith('fa')) {
		return {
			type: FolderIconType.FontAwesome,
			emoji: '',
			name: iconData,
			dataUrl: '',
		};
	} else {
		return {
			type: FolderIconType.Emoji,
			emoji: iconData,
			name: '',
			dataUrl: '',
		};
	}
};
export default parseFolderIcon;
