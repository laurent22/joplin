import { PluginItem } from '@joplin/lib/components/shared/config/plugins/types';
import * as React from 'react';
import { _ } from '@joplin/lib/locale';
import { useCallback, useState } from 'react';
import { IconButton, List, Portal, Text } from 'react-native-paper';
import getPluginBugReportInfo, { ReportPluginIssueOption } from '@joplin/lib/services/plugins/utils/getPluginBugReportInfo';
import getPackageInfo from '../../../../../utils/getPackageInfo';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import DismissibleDialog from '../../../../DismissibleDialog';
import openWebsiteForPlugin from '../utils/openWebsiteForPlugin';
import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';

interface Props {
	themeId: number;
	size: number;
	item: PluginItem;
	onModalDismiss?: ()=> void;
}

interface IssueReportLinkProps {
	section: ReportPluginIssueOption;
}

const IssueReportLink: React.FC<IssueReportLinkProps> = props => {
	const section = props.section;

	const onPress = useCallback(() => {
		void Linking.openURL(section.url);
	}, [section.url]);

	return (
		<List.Item
			title={section.title}
			titleNumberOfLines={2}
			description={section.description}
			onPress={onPress}
			left={props => <List.Icon {...props} icon={section.mobileIcon} />}
		/>
	);
};

const PluginInfoModal: React.FC<Props> = props => {
	const [reportInfo, setReportInfo] = useState<ReportPluginIssueOption[]>([]);
	useAsyncEffect(async event => {
		const packageInfo = getPackageInfo();
		const reportPluginOptions = await getPluginBugReportInfo(props.item.manifest, packageInfo);
		if (!event.cancelled) {
			setReportInfo(reportPluginOptions);
		}
	}, [props.item]);

	const issueReportListItems: React.ReactNode[] = [];
	for (const section of reportInfo) {
		issueReportListItems.push(<IssueReportLink key={section.key} section={section} />);
	}

	const aboutPlugin = (
		<View style={styles.aboutPluginContainer}>
			<Text variant='titleLarge'>{props.item.manifest.name}</Text>
			<Text variant='bodyLarge'>{props.item.manifest.author ? _('by %s', props.item.manifest.author) : ''}</Text>
			<Text style={styles.descriptionText}>{props.item.manifest.description ?? _('No description')}</Text>
		</View>
	);

	const onAboutPress = useCallback(() => {
		void openWebsiteForPlugin({ item: props.item });
	}, [props.item]);

	return (
		<Portal>
			<DismissibleDialog
				themeId={props.themeId}
				visible={true}
				onDismiss={props.onModalDismiss}
			>
				<ScrollView>
					{aboutPlugin}
					<List.Item
						left={props => <List.Icon {...props} icon='web'/>}
						title={_('About')}
						onPress={onAboutPress}
					/>
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
				size={props.size}
				icon='information'
				onPress={onInfoButtonPress}
			/>
		</>
	);
};

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

export default PluginInfoButton;
