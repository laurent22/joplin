import { _ } from '@joplin/lib/locale';
import { themeStyle } from '@joplin/lib/theme';
import * as React from 'react';
import { useMemo } from 'react';
import { Linking, View, StyleSheet, ViewStyle } from 'react-native';
import { Button, Card, Icon, Text } from 'react-native-paper';

interface Props {
	themeId: number;
	onEnablePluginSupport: ()=> void;
}

const onLearnMorePress = () => {
	void Linking.openURL('https://joplinapp.org/help/apps/plugins');
};

const useStyles = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId);
		const basePrecautionCard: ViewStyle = {
			margin: 8,
		};

		return StyleSheet.create({
			descriptionContainer: {
				padding: theme.margin,
			},
			firstPrecautionCard: {
				...basePrecautionCard,
				marginTop: 6,
			},
			precautionCard: {
				...basePrecautionCard,
				borderTopColor: theme.dividerColor,
				borderTopWidth: 1,
				paddingTop: theme.itemMarginTop,
				borderRadius: 0,
			},
			actionButtonContainer: {
				margin: theme.margin,
			},
		});
	}, [themeId]);
};

const EnablePluginSupportPage: React.FC<Props> = props => {
	const styles = useStyles(props.themeId);

	let isFirstCard = true;
	const renderCard = (icon: string, title: string, description: string) => {
		const style = isFirstCard ? styles.firstPrecautionCard : styles.precautionCard;
		isFirstCard = false;
		return (
			<Card elevation={0} style={style}>
				<Card.Title
					title={title}
					subtitle={description}
					subtitleNumberOfLines={4}
					left={(props) => <Icon {...props} source={icon}/>}
				/>
			</Card>
		);
	};
	return (
		<View>
			<View style={styles.descriptionContainer}>
				<Text>{_('Like any software you install, plugins can potentially cause security issues or data loss.')}</Text>
				<Text>{_('Here\'s what we do to make plugins safer:')}</Text>
			</View>
			{renderCard('crown', _('Recommended Plugins'), _('We mark plugins developed by trusted Joplin community members as "recommended".'))}
			{renderCard('source-branch-check', _('Open Source'), _('Most plugins have source code available for review on the plugin website.'))}
			{renderCard('flag-remove', _('Report system'), _('We have a system for reporting and removing problematic plugins.'))}
			<View style={styles.actionButtonContainer}>
				<Button onPress={onLearnMorePress}>{_('Learn more')}</Button>
				<Button mode='contained' icon='check' onPress={props.onEnablePluginSupport}>{_('Enable plugin support')}</Button>
			</View>
		</View>
	);
};

export default EnablePluginSupportPage;
