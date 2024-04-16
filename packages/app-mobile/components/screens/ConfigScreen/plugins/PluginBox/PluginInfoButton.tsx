import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useCallback, useState } from 'react';
import { IconButton, List, Portal, Text } from 'react-native-paper';
import getReportPluginInformation, { ReportPluginIssueOption } from '@joplin/lib/services/plugins/utils/getReportPluginInformation';
import getPackageInfo from '../../../../../utils/getPackageInfo';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import DismissibleDialog from '../../../../DismissibleDialog';
import openWebsiteForPlugin from '../utils/openWebsiteForPlugin';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import ActionButton from './ActionButton';

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
	},
	descriptionText: {
		marginTop: 5,
		marginBottom: 5,
	},
});

const PluginInfoModal: React.FC<Props> = props => {
	const [reportInfo, setReportInfo] = useState<ReportPluginIssueOption[]>([]);
	useAsyncEffect(async event => {
		const packageInfo = getPackageInfo();
		const reportPluginOptions = await getReportPluginInformation(props.item.manifest, packageInfo);
		if (!event.cancelled) {
			setReportInfo(reportPluginOptions);
		}
	}, [props.item]);

	const issueReportListItems: React.ReactNode[] = [];
	for (const section of reportInfo) {
		issueReportListItems.push(
			<List.Item
				key={`${section.url}-${section.title}`}
				title={section.title}
				titleNumberOfLines={2}
				description={section.description}
				onPress={() => Linking.openURL(section.url)}
				left={props => <List.Icon {...props} icon={section.mobileIcon} />}
			/>,
		);
	}

	const aboutPlugin = (
		<View style={styles.aboutPluginContainer}>
			<Text variant='titleLarge'>{props.item.manifest.name}</Text>
			<Text variant='bodyLarge'>{props.item.manifest.author ? _('by %s', props.item.manifest.author) : ''}</Text>
			<Text style={styles.descriptionText}>{props.item.manifest.description ?? _('No description')}</Text>

			<ActionButton
				item={props.item}
				title={_('More information')}
				onPress={openWebsiteForPlugin}
			/>
		</View>
	);

	return (
		<Portal>
			<DismissibleDialog
				themeId={props.themeId}
				visible={true}
				onDismiss={props.onModalDismiss}
			>
				<ScrollView>
					{aboutPlugin}
					<List.Accordion
						title={_('Report an issue')}
						left={props => <List.Icon {...props} icon='bug' />}
					>
						{issueReportListItems}
					</List.Accordion>
				</ScrollView>
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
				icon='information-outline'
				onPress={onInfoButtonPress}
				accessibilityLabel={_('Info')}
			/>
		</>
	);
};

export default PluginInfoButton;
