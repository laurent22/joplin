import * as React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, Text, ScrollView, RefreshControl } from 'react-native';
import { themeStyle } from '../../global-style';
import ScreenHeader from '../../ScreenHeader';
import { _ } from '@joplin/lib/locale';
import { ShareInvitation, ShareUserStatus } from '@joplin/lib/services/share/reducer';
import { AppState } from '../../../utils/types';
import { connect } from 'react-redux';
import IncomingShareItem from './IncomingShareItem';
import AcceptedShareItem from './AcceptedShareItem';
import ShareService from '@joplin/lib/services/share/ShareService';

interface Props {
	themeId: number;
	shareInvitations: ShareInvitation[];
	processingShareInvitationResponse: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see https://github.com/laurent22/joplin/pull/10297
const useStyles = (theme: any) => {
	return useMemo(() => {
		const margin = theme.margin;
		return StyleSheet.create({
			root: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			header: {
				...theme.headerStyle,
				marginLeft: margin,
				marginTop: margin,
				marginRight: margin,
			},
			noSharesText: {
				...theme.normalText,
				margin,
			},
			shareListContainer: {
				flex: 1,
				flexDirection: 'column',
				margin,
			},
			scrollingContainer: {
				height: '100%',
			},
		});
	}, [theme]);
};

const ManageSharesComponent: React.FC<Props> = props => {
	const theme = themeStyle(props.themeId);
	const styles = useStyles(theme);

	const [refreshing, setRefreshing] = useState(false);
	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await ShareService.instance().refreshShareInvitations();
		setRefreshing(false);
	}, []);

	const incomingShareComponents: React.ReactNode[] = [];
	const acceptedShareComponents: React.ReactNode[] = [];
	for (const share of props.shareInvitations) {
		if (share.status === ShareUserStatus.Waiting) {
			incomingShareComponents.push(
				<IncomingShareItem
					key={`incoming-share-${share.id}`}
					invitation={share}
					processing={props.processingShareInvitationResponse}
				/>,
			);
		} else if (share.status === ShareUserStatus.Accepted) {
			acceptedShareComponents.push(
				<AcceptedShareItem
					key={`accepted-share-${share.id}`}
					invitation={share}
					processing={props.processingShareInvitationResponse}
				/>,
			);
		}
	}

	const renderNoIncomingShares = () => {
		if (incomingShareComponents.length > 0) return null;
		return <Text key='no-shares' style={styles.noSharesText}>{_('No incoming shares')}</Text>;
	};

	const renderAcceptedShares = () => {
		if (acceptedShareComponents.length === 0) return null;
		return <>
			<Text style={styles.header}>{_('Accepted shares')}</Text>
			<View style={styles.shareListContainer}>
				{acceptedShareComponents}
			</View>
		</>;
	};

	return (
		<View style={styles.root}>
			<ScreenHeader title={_('Shares')} />
			<ScrollView
				style={styles.scrollingContainer}
				refreshControl={
					<RefreshControl
						tintColor={theme.color}
						colors={[theme.color]}
						refreshing={refreshing}
						onRefresh={onRefresh}
					/>
				}
			>
				<Text style={styles.header}>{_('Incoming shares')}</Text>
				<View style={styles.shareListContainer}>
					{renderNoIncomingShares()}
					{incomingShareComponents}
				</View>
				{renderAcceptedShares()}
			</ScrollView>
		</View>
	);
};

export default connect((state: AppState) => {
	return {
		shareInvitations: state.shareService.shareInvitations,
		processingShareInvitationResponse: state.shareService.processingShareInvitationResponse,
	};
})(ManageSharesComponent);
