import { Theme } from '@joplin/lib/themes/type';
const { themeStyle } = require('../../global-style.js');
import { useMemo } from 'react';
import { StyleProp, TextStyle, ViewStyle } from 'react-native';

export interface ExportScreenStyles {
	rootStyle: StyleProp<ViewStyle>;
	sectionContainerStyle: StyleProp<ViewStyle>;
	sectionHeaderStyle: StyleProp<TextStyle>;
	sectionDescriptionStyle: StyleProp<TextStyle>;
	statusTextStyle: StyleProp<TextStyle>;
	warningTextStyle: StyleProp<TextStyle>;

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
			sectionContainerStyle: {
				marginLeft: 10,
				marginRight: 10,
				marginBottom: 5,
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
			warningTextStyle: {
				...baseTextStyle,
				color: theme.color,
				backgroundColor: theme.warningBackgroundColor,
			},
			subsectionContainerStyle: {
				marginBottom: 15,
			},

			keyboardAppearance: (theme as any).keyboardAppearance,
		};
	}, [themeId]);
};

export default useStyles;
