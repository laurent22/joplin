import { FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import * as React from 'react';
import { ImageStyle, TextStyle, Image, Text, StyleSheet } from 'react-native';
import Icon from '../Icon';

interface Props {
	style?: ImageStyle & TextStyle;
	icon: FolderIcon|string;
}

const SidebarIcon: React.FC<Props> = ({ icon, style }) => {
	if (typeof icon === 'string') {
		icon = {
			type: FolderIconType.FontAwesome,
			name: icon,
			emoji: '',
			dataUrl: '',
		};
	}
	if (icon.type === FolderIconType.Emoji) {
		return <Text style={[styles.baseTextIcon, styles.emojiIcon, style]}>{icon.emoji}</Text>;
	} else if (icon.type === FolderIconType.DataUrl) {
		return <Image style={[styles.imageIcon, style]} source={{ uri: icon.dataUrl }}/>;
	} else if (icon.type === FolderIconType.FontAwesome) {
		return <Icon style={[styles.baseTextIcon, styles.fontIcon, style]} name={icon.name} accessibilityLabel={null}/>;
	} else {
		throw new Error(`Unsupported folder icon type: ${icon.type}`);
	}
};

const styles = StyleSheet.create({
	baseTextIcon: {
		textAlign: 'center',
		textAlignVertical: 'center',
	},
	imageIcon: {
		height: 20,
		resizeMode: 'contain',
	},
	fontIcon: {
		fontSize: 23,
		width: 24,
	},
	emojiIcon: {
		fontSize: 16,
	},
});

export default SidebarIcon;
