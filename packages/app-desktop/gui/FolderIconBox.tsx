import { FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';

interface Props {
	folderIcon: FolderIcon;
	opacity?: number;
}

export default function(props: Props) {
	const folderIcon = props.folderIcon;
	const opacity = 'opacity' in props ? props.opacity : 1;

	if (folderIcon.type === FolderIconType.Emoji) {
		return <span style={{ fontSize: 20, opacity }}>{folderIcon.emoji}</span>;
	} else if (folderIcon.type === FolderIconType.DataUrl) {
		return <img style={{ width: 20, height: 20, opacity }} src={folderIcon.dataUrl} />;
	} else if (folderIcon.type === FolderIconType.FontAwesome) {
		return <i style={{ fontSize: 18, width: 20, opacity }} className={folderIcon.name}></i>;
	} else {
		throw new Error(`Unsupported folder icon type: ${folderIcon.type}`);
	}
}
