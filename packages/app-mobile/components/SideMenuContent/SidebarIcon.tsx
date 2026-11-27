import { FolderIcon, FolderIconType } from '@joplin/lib/services/database/types';
import * as React from 'react';
import { ImageStyle, TextStyle, Image, Text, StyleSheet, StyleProp, View, useWindowDimensions } from 'react-native';
import Icon from '../Icon';

export type IconStyle = ImageStyle & TextStyle;

interface Props {
	style?: StyleProp<IconStyle>;
	icon: FolderIcon|string|null;
}

const SidebarIcon: React.FC<Props> = ({ icon, style }) => {
	const { fontScale } = useWindowDimensions();
	const slotStyle = { width: iconWidth * Math.max(1, fontScale) };

	if (!icon) {
		return <View style={slotStyle}/>;
	}

	if (typeof icon === 'string') {
		icon = {
			type: FolderIconType.FontAwesome,
			name: icon,
			emoji: '',
			dataUrl: '',
		};
	}
	if (icon.type === FolderIconType.Emoji) {
		return <Text numberOfLines={1} style={[styles.baseTextIcon, styles.emojiIcon, slotStyle, style]}>{icon.emoji}</Text>;
	} else if (icon.type === FolderIconType.DataUrl) {
		return <Image style={[styles.imageIcon, slotStyle, style]} source={{ uri: icon.dataUrl }}/>;
	} else if (icon.type === FolderIconType.FontAwesome) {
		return <Icon style={[styles.baseTextIcon, styles.fontIcon, slotStyle, style]} name={icon.name} accessibilityLabel={null}/>;
	} else {
		throw new Error(`Unsupported folder icon type: ${icon.type}`);
	}
};

const iconWidth = 20;
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
		fontSize: 18,
	},
	emojiIcon: {
		fontSize: 16,
	},
});

export default SidebarIcon;
