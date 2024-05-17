import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import { useMemo } from 'react';
import { Chip } from 'react-native-paper';
import { themeStyle } from '../../../../global-style';
import { Alert, Linking } from 'react-native';


interface Props {
	themeId: number;
}


const onRecommendedPress = () => {
	Alert.alert(
		'',
		_('The Joplin team has vetted this plugin and it meets our standards for security and performance.'),
		[
			{
				text: _('Learn more'),
				onPress: () => Linking.openURL('https://github.com/joplin/plugins/blob/master/readme/recommended.md'),
			},
			{
				text: _('OK'),
			},
		],
		{ cancelable: true },
	);
};

const useThemeOverride = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return {
			colors: {
				secondaryContainer: theme.searchMarkerBackgroundColor,
				onSecondaryContainer: theme.searchMarkerColor,
				primary: theme.searchMarkerColor,
			},
		};
	}, [themeId]);
};

const RecommendedChip: React.FC<Props> = props => {
	const theme = useThemeOverride(props.themeId);
	return <Chip
		icon='crown'
		mode='flat'
		theme={theme}
		onPress={onRecommendedPress}
	>
		{_('Recommended')}
	</Chip>;
};

export default RecommendedChip;
