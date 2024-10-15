import { FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import EmojiBox from './EmojiBox';

interface Props {
	folderIcon: FolderIcon;
	opacity?: number;
}

export default function(props: Props) {
	const folderIcon = props.folderIcon;
	const opacity = 'opacity' in props ? props.opacity : 1;
	const width = 20;
	const height = 20;

	if (folderIcon.type === FolderIconType.Emoji) {
		return <EmojiBox width={width} height={height} emoji={folderIcon.emoji}/>;
	} else if (folderIcon.type === FolderIconType.DataUrl) {
		return <img style={{ width, height, opacity }} src={folderIcon.dataUrl} />;
	} else if (folderIcon.type === FolderIconType.FontAwesome) {
		return <i style={{ fontSize: 18, width, opacity }} className={folderIcon.name} role='img'></i>;
	} else {
		throw new Error(`Unsupported folder icon type: ${folderIcon.type}`);
	}
}
