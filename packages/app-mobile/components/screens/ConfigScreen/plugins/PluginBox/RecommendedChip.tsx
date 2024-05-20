import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import { themeStyle } from '../../../../global-style';
import { Alert, Linking } from 'react-native';
import { Chip } from 'react-native-paper';
import { useMemo } from 'react';


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

const RecommendedChip: React.FC<Props> = props => {
	const themeOverride = useMemo(() => {
		const theme = themeStyle(props.themeId);

		return {
			colors: {
				secondaryContainer: theme.searchMarkerBackgroundColor,
				onSecondaryContainer: theme.searchMarkerColor,
				primary: theme.searchMarkerColor,
			},
		};
	}, [props.themeId]);

	return <Chip
		icon='crown'
		compact={true}
		theme={themeOverride}
		onPress={onRecommendedPress}
	>
		{_('Recommended')}
	</Chip>;
};

export default RecommendedChip;
