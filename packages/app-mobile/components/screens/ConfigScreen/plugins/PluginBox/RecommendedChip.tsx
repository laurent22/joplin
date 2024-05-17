import { _ } from '@joplin/lib/locale';
import * as React from 'react';
import { themeStyle } from '../../../../global-style';
import { Alert, Linking } from 'react-native';
import SmallChip from './SmallChip';


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
	const theme = themeStyle(props.themeId);
	return <SmallChip
		icon='crown'
		foreground={theme.searchMarkerColor}
		background={theme.searchMarkerBackgroundColor}
		onPress={onRecommendedPress}
	>
		{_('Recommended')}
	</SmallChip>;
};

export default RecommendedChip;
