import { _ } from '@joplin/lib/locale';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import * as React from 'react';
import IconButton from '../../../../IconButton';
import { Alert, Linking, StyleSheet } from 'react-native';
import { themeStyle } from '../../../../global-style';
import { useMemo } from 'react';

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

interface Props {
	themeId: number;
	manifest: PluginManifest;
	isCompatible: boolean;
}

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		return StyleSheet.create({
			container: {
				opacity: 0.8,
			},
			wrapper: {
				borderColor: theme.colorWarn,
				borderWidth: 1,
				borderRadius: 20,
				justifyContent: 'center',
				height: 32,
				width: 32,
				textAlign: 'center',
			},
			icon: {
				fontSize: 14,
				color: theme.colorWarn,
				marginLeft: 'auto',
				marginRight: 'auto',
			},
		});
	}, [themeId]);
};

const RecommendedBadge: React.FC<Props> = props => {
	const styles = useStyles(props.themeId);

	if (!props.manifest._recommended || !props.isCompatible) return null;

	return <IconButton
		onPress={onRecommendedPress}
		iconName='fas fa-crown'
		containerStyle={styles.container}
		contentWrapperStyle={styles.wrapper}
		iconStyle={styles.icon}
		themeId={props.themeId}
		description={_('Recommended')}
	/>;
};

export default RecommendedBadge;
