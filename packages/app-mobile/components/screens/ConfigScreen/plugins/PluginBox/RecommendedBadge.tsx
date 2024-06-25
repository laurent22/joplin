import { _ } from '@joplin/lib/locale';
import { PluginManifest } from '@joplin/lib/services/plugins/utils/types';
import * as React from 'react';
import IconButton from '../../../../IconButton';
import { Linking, StyleSheet } from 'react-native';
import { themeStyle } from '../../../../global-style';
import { useCallback, useContext, useMemo } from 'react';
import { DialogContext } from '../../../../DialogManager';

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

	const dialogs = useContext(DialogContext);
	const onRecommendedPress = useCallback(() => {
		dialogs.prompt(
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
	}, [dialogs]);

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
