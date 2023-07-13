import { Theme } from '@joplin/lib/themes/type';
const { themeStyle } = require('../../global-style.js');
import { useMemo } from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';

export interface ExportScreenStyles {
	rootStyle: StyleProp<ViewStyle>;
	sectionHeaderStyle: StyleProp<TextStyle>;
	sectionDescriptionStyle: StyleProp<TextStyle>;
	statusTextStyle: StyleProp<TextStyle>;

	shareButtonIconName: string;

	subsectionContainerStyle: StyleProp<ViewStyle>;

	keyboardAppearance: 'default'|'light'|'dark';
}

const useStyles = (themeId: number): ExportScreenStyles => {
	return useMemo(() => {
		const theme: Theme = themeStyle(themeId);

		const baseTextStyle: StyleProp<TextStyle> = {
			color: theme.color,
			fontSize: (theme as any).fontSize ?? 12,
		};

		return {
			rootStyle: {
				backgroundColor: theme.backgroundColor,
				flex: 1,
			},
			sectionHeaderStyle: {
				...baseTextStyle,
				fontSize: 24,
				marginTop: 14,
			},
			sectionDescriptionStyle: {
				...baseTextStyle,
				color: theme.colorFaded,
				fontStyle: 'italic',
			},
			statusTextStyle: {
				...baseTextStyle,
				textAlign: 'center',
			},
			subsectionContainerStyle: {
				marginBottom: 15,
			},

			shareButtonIconName: 'export',

			keyboardAppearance: (theme as any).keyboardAppearance,
		};
	}, [themeId]);
};

export default useStyles;
