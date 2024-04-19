import * as React from 'react';
import { StyledRoot, StyledSyncReportText, StyledSyncReport, StyledSynchronizeButton } from './styles';
import { ButtonLevel } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import Synchronizer from '@joplin/lib/Synchronizer';
import { _ } from '@joplin/lib/locale';
import { AppState } from '../../app.reducer';
import { StateDecryptionWorker, StateResourceFetcher } from '@joplin/lib/reducer';
import { connect } from 'react-redux';
import { themeStyle } from '@joplin/lib/theme';
import { Dispatch } from 'redux';
import FolderAndTagList from './FolderAndTagList';


interface Props {
	themeId: number;
	dispatch: Dispatch;
	decryptionWorker: StateDecryptionWorker;
	resourceFetcher: StateResourceFetcher;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	syncReport: any;
	syncStarted: boolean;
}

const SidebarComponent = (props: Props) => {
	const renderSynchronizeButton = (type: string) => {
		const label = type === 'sync' ? _('Synchronise') : _('Cancel');
		const iconAnimation = type !== 'sync' ? 'icon-infinite-rotation 1s linear infinite' : '';

		return (
			<StyledSynchronizeButton
				level={ButtonLevel.SidebarSecondary}
				iconName="icon-sync"
				key="sync_button"
				iconAnimation={iconAnimation}
				title={label}
				onClick={() => {
					void CommandService.instance().execute('synchronize', type !== 'sync');
				}}
			/>
		);
	};

	const theme = themeStyle(props.themeId);

	let decryptionReportText = '';
	if (props.decryptionWorker && props.decryptionWorker.state !== 'idle' && props.decryptionWorker.itemCount) {
		decryptionReportText = _('Decrypting items: %d/%d', props.decryptionWorker.itemIndex + 1, props.decryptionWorker.itemCount);
	}

	let resourceFetcherText = '';
	if (props.resourceFetcher && props.resourceFetcher.toFetchCount) {
		resourceFetcherText = _('Fetching resources: %d/%d', props.resourceFetcher.fetchingCount, props.resourceFetcher.toFetchCount);
	}

	const lines = Synchronizer.reportToLines(props.syncReport);
	if (resourceFetcherText) lines.push(resourceFetcherText);
	if (decryptionReportText) lines.push(decryptionReportText);
	const syncReportText = [];
	for (let i = 0; i < lines.length; i++) {
		syncReportText.push(
			<StyledSyncReportText key={i}>
				{lines[i]}
			</StyledSyncReportText>,
		);
	}

	const syncButton = renderSynchronizeButton(props.syncStarted ? 'cancel' : 'sync');

	const syncReportComp = !syncReportText.length ? null : (
		<StyledSyncReport key="sync_report">
			{syncReportText}
		</StyledSyncReport>
	);

	return (
		<StyledRoot className="sidebar">
			<div style={{ flex: 1 }}><FolderAndTagList/></div>
			<div style={{ flex: 0, padding: theme.mainPadding }}>
				{syncReportComp}
				{syncButton}
			</div>
		</StyledRoot>
	);
};

const mapStateToProps = (state: AppState) => {
	return {
		searches: state.searches,
		syncStarted: state.syncStarted,
		syncReport: state.syncReport,
		selectedSearchId: state.selectedSearchId,
		selectedSmartFilterId: state.selectedSmartFilterId,
		locale: state.settings.locale,
		themeId: state.settings.theme,
		collapsedFolderIds: state.collapsedFolderIds,
		decryptionWorker: state.decryptionWorker,
		resourceFetcher: state.resourceFetcher,
	};
};

export default connect(mapStateToProps)(SidebarComponent);
