import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useCallback, useMemo, useState } from 'react';
import { Button, IconButton, List, Portal, Text } from 'react-native-paper';
import getPluginIssueReportUrl from '@joplin/lib/services/plugins/utils/getPluginIssueReportUrl';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import DismissibleDialog from '../../../../DismissibleDialog';
import openWebsiteForPlugin from '../utils/openWebsiteForPlugin';
import categoryColors from './categoryColors';

interface Props {
	themeId: number;
	size: number;
	item: PluginItem;
	onModalDismiss?: ()=> void;
}

const styles = StyleSheet.create({
	aboutPluginContainer: {
		paddingLeft: 10,
		paddingRight: 10,
		paddingBottom: 10,
	},
	descriptionText: {
		marginTop: 5,
		marginBottom: 5,
	},
	fraudulentPluginButton: {
		opacity: 0.6,
	},
	categoryContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 10,
		marginBottom: 10,
	},
	categoryBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 15,
		marginRight: 5,
		marginBottom: 5,
		alignSelf: 'flex-start',
	},
	categoryText: {
		color: 'white',
		fontWeight: 'bold',
	},
});

const PluginInfoModal: React.FC<Props> = props => {
	const aboutPlugin = (
		<View style={styles.aboutPluginContainer}>
			<Text variant='titleLarge'>{props.item.manifest.name}</Text>
			<Text variant='bodyLarge'>{props.item.manifest.author ? _('by %s', props.item.manifest.author) : ''}</Text>
			<Text style={styles.descriptionText}>{props.item.manifest.description ?? _('No description')}</Text>
		</View>
	);

	const renderCategories = () => {
		const categories = props.item.manifest.categories || [];

		if (!categories || categories.length === 0) {
			return (
				<View style={[styles.categoryBadge, { backgroundColor: 'gray' }]}>
					<Text style={styles.categoryText}>{_('Other')}</Text>
				</View>
			);
		}

		return (
			<View style={styles.categoryContainer}>
				{categories.map((category, index) => {
					const lowerCaseCategory = category.toLowerCase();
					return (
						<View key={index} style={[styles.categoryBadge, { backgroundColor: categoryColors[lowerCaseCategory] }]}>
							<Text style={styles.categoryText}>{category}</Text>
						</View>
					);
				})}
			</View>
		);
	};

	const onAboutPress = useCallback(() => {
		void openWebsiteForPlugin({ item: props.item });
	}, [props.item]);

	const reportIssueUrl = useMemo(() => {
		return getPluginIssueReportUrl(props.item.manifest);
	}, [props.item]);

	const onReportIssuePress = useCallback(() => {
		void Linking.openURL(reportIssueUrl);
	}, [reportIssueUrl]);

	const reportIssueButton = (
		<List.Item
			left={props => <List.Icon {...props} icon='bug'/>}
			title={_('Report an issue')}
			onPress={onReportIssuePress}
		/>
	);

	const onReportFraudulentPress = useCallback(() => {
		void Linking.openURL('https://github.com/laurent22/joplin/security/advisories/new');
	}, []);

	const onRepositoryPress = useCallback(() => {
		if (props.item.manifest.repository_url) {
			void Linking.openURL(props.item.manifest.repository_url);
		}
	}, [props.item.manifest.repository_url]);

	const onHomepagePress = useCallback(() => {
		if (props.item.manifest.homepage_url) {
			void Linking.openURL(props.item.manifest.homepage_url);
		}
	}, [props.item.manifest.homepage_url]);

	return (
		<Portal>
			<DismissibleDialog
				themeId={props.themeId}
				visible={true}
				onDismiss={props.onModalDismiss}
			>
				<ScrollView>
					{aboutPlugin}
					{renderCategories()}
					<List.Item
						left={props => <List.Icon {...props} icon='web'/>}
						title={_('About')}
						onPress={onAboutPress}
					/>
					{props.item.manifest.repository_url && (
						<List.Item
							left={props => <List.Icon {...props} icon='source-repository'/>}
							title={_('Plugin\'s Repository')}
							onPress={onRepositoryPress}
						/>
					)}
					{props.item.manifest.homepage_url && (
						<List.Item
							left={props => <List.Icon {...props} icon='home'/>}
							title={_('Plugin\'s Homepage')}
							onPress={onHomepagePress}
						/>
					)}
					{ reportIssueUrl ? reportIssueButton : null }
				</ScrollView>
				<Button
					icon='shield-bug'
					style={styles.fraudulentPluginButton}
					onPress={onReportFraudulentPress}
				>{_('Report fraudulent plugin')}</Button>
			</DismissibleDialog>
		</Portal>
	);
};

const PluginInfoButton: React.FC<Props> = props => {
	const [showInfoModal, setShowInfoModal] = useState(false);
	const onInfoButtonPress = useCallback(() => {
		setShowInfoModal(true);
	}, []);

	const onModalDismiss = useCallback(() => {
		setShowInfoModal(false);
		props.onModalDismiss?.();
	}, [props.onModalDismiss]);

	return (
		<>
			{showInfoModal ? <PluginInfoModal {...props} onModalDismiss={onModalDismiss} /> : null}
			<IconButton
				size={props.size}
				icon='information'
				onPress={onInfoButtonPress}
			/>
		</>
	);
};

export default PluginInfoButton;
