import { _ } from '@joplin/lib/locale';
import { themeStyle } from '../../../global-style';
import * as React from 'react';
import { useMemo } from 'react';
import { Linking, View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Button, Card, Divider, Icon, List, Text } from 'react-native-paper';

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
			margin: theme.margin,
		};

		const baseTitleStyle: TextStyle = {
			fontWeight: 'bold',
			color: theme.color,
			fontSize: theme.fontSize,
		};

		const styles = StyleSheet.create({
			descriptionText: {
				padding: theme.margin,
				paddingTop: 0,
			},
			firstPrecautionCard: {
				...basePrecautionCard,
			},
			precautionCard: {
				...basePrecautionCard,
				marginTop: 0,
			},
			cardContent: {
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
			},
			title: baseTitleStyle,
			header: {
				...baseTitleStyle,
				margin: theme.margin,
				marginBottom: 0,
			},
			actionButton: {
				borderRadius: 10,
				marginLeft: theme.marginLeft * 2,
				marginRight: theme.marginRight * 2,
				marginBottom: theme.margin,
			},
		});

		const themeOverride = {
			secondaryButton: {
				colors: {
					primary: theme.color4,
					outline: theme.color4,
				},
			},
			primaryButton: {
				colors: {
					primary: theme.color4,
					onPrimary: theme.backgroundColor4,
				},
			},
			card: {
				colors: {
					outline: theme.codeBorderColor,
				},
			},
		};

		return { styles, themeOverride };
	}, [themeId]);
};

const EnablePluginSupportPage: React.FC<Props> = props => {
	const { styles, themeOverride } = useStyles(props.themeId);

	let isFirstCard = true;
	const renderCard = (icon: string, title: string, description: string) => {
		const style = isFirstCard ? styles.firstPrecautionCard : styles.precautionCard;
		isFirstCard = false;
		return (
			<Card
				mode='outlined'
				style={style}
				contentStyle={styles.cardContent}
				theme={themeOverride.card}
			>
				<Card.Title
					title={title}
					titleStyle={styles.title}
					subtitle={description}
					subtitleNumberOfLines={4}
					left={(props) => <Icon {...props} source={icon}/>}
				/>
			</Card>
		);
	};

	return (
		<View>
			<List.Section
				title={_('What are plugins?')}
				titleStyle={styles.title}
			>
				<Text style={styles.descriptionText}>{_('Plugins extend Joplin with features that are not present by default. Plugins can extend Joplin\'s editor, viewer, and more.')}</Text>
			</List.Section>
			<Divider/>
			<List.Section
				title={_('Plugin security')}
				titleStyle={styles.title}
			>
				<Text style={styles.descriptionText}>{_('Like any software you install, plugins can potentially cause security issues or data loss.')}</Text>
			</List.Section>
			<Divider/>
			<Text variant='titleMedium' style={styles.header}>{_('Here\'s what we do to make plugins safer:')}</Text>
			{renderCard('crown', _('Recommended plugins'), _('We mark plugins developed by trusted Joplin community members as "recommended".'))}
			{renderCard('source-branch-check', _('Open Source'), _('Most plugins have source code available for review on the plugin website.'))}
			{renderCard('flag-remove', _('Report system'), _('We have a system for reporting and removing problematic plugins.'))}
			<View>
				<Button style={styles.actionButton} theme={themeOverride.secondaryButton} onPress={onLearnMorePress}>{_('Learn more')}</Button>
				<Button style={styles.actionButton} theme={themeOverride.primaryButton} mode='contained' onPress={props.onEnablePluginSupport}>{_('Enable plugin support')}</Button>
			</View>
		</View>
	);
};

export default EnablePluginSupportPage;
