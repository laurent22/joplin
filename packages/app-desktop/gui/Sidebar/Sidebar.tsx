import * as React from 'react';
import { StyledSyncReportText, StyledSyncReport, StyledSynchronizeButton, StyledRoot } from './styles';
import { ButtonLevel } from '../Button/Button';
import CommandService from '@joplin/lib/services/CommandService';
import Synchronizer from '@joplin/lib/Synchronizer';
import Setting from '@joplin/lib/models/Setting';
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
	syncPending: boolean;
	syncReportIsVisible: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- The generated report does not currently have a type
const syncCompletedWithoutError = (syncReport: any) => {
	return syncReport.completedTime && (!syncReport.errors || !syncReport.errors.length);
};

const SidebarComponent = (props: Props) => {
	const renderSynchronizeButton = (type: string) => {
		const label = type === 'sync' ? _('Synchronise') : _('Cancel');
		const nothingToSync = type === 'sync' && !props.syncPending && syncCompletedWithoutError(props.syncReport);
		const iconName = nothingToSync ? 'fas fa-check' : 'icon-sync';

		return (
			<StyledSynchronizeButton
				level={ButtonLevel.SidebarSecondary}
				className={`sidebar-sync-button ${type === 'sync' ? '' : '-syncing'} ${nothingToSync ? '-synced' : ''}`}
				iconName={iconName}
				key="sync_button"
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

	const hasSyncReport = syncReportText.length > 0;

	const syncReportComp = !hasSyncReport || !props.syncReportIsVisible ? null : (
		<StyledSyncReport key="sync_report" id="sync-report">
			{syncReportText}
		</StyledSyncReport>
	);

	const syncReportToggle = (
		<button
			className="sync-report-toggle"
			style={{ color: theme.color2 }}
			onClick={() => Setting.toggle('syncReportIsVisible')}
			aria-label={_('Sync report')}
			aria-expanded={props.syncReportIsVisible}
			aria-controls="sync-report"
		>
			<i className={`fas fa-chevron-${props.syncReportIsVisible ? 'down' : 'up'}`}/>
		</button>
	);

	return (
		<StyledRoot className='sidebar _scrollbar2' role='navigation' aria-label={_('Sidebar')}>
			<div style={{ flex: 1 }}><FolderAndTagList/></div>
			<div style={{ flex: 0, padding: theme.mainPadding }}>
				{syncReportToggle}
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
		syncPending: state.syncPending,
		syncReport: state.syncReport,
		selectedSearchId: state.selectedSearchId,
		selectedSmartFilterId: state.selectedSmartFilterId,
		locale: state.settings.locale,
		themeId: state.settings.theme,
		collapsedFolderIds: state.collapsedFolderIds,
		decryptionWorker: state.decryptionWorker,
		resourceFetcher: state.resourceFetcher,
		syncReportIsVisible: state.settings.syncReportIsVisible,
	};
};

export default connect(mapStateToProps)(SidebarComponent);
