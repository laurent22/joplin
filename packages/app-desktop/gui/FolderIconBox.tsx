import { FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';

interface Props {
	folderIcon: FolderIcon;
}

export default function(props: Props) {
	const folderIcon = props.folderIcon;

	if (folderIcon.type === FolderIconType.Emoji) {
		return <span style={{ fontSize: 20 }}>{folderIcon.emoji}</span>;
	} else if (folderIcon.type === FolderIconType.DataUrl) {
		return <img style={{ width: 22, height: 22 }} src={folderIcon.dataUrl} />;
	} else {
		throw new Error(`Unsupported folder icon type: ${folderIcon.type}`);
	}
}
