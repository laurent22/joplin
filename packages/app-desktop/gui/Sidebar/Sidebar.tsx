import * as React from 'react';
import { useCallback } from 'react';
import { StyledSyncReportText, StyledSyncReport, StyledSynchronizeButton, StyledRoot } from './styles';
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
import Setting from '@joplin/lib/models/Setting';
import time from '@joplin/lib/time';


interface Props {
	themeId: number;
	dispatch: Dispatch;
	decryptionWorker: StateDecryptionWorker;
	resourceFetcher: StateResourceFetcher;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	syncReport: any;
	syncStarted: boolean;
	syncReportLogExpanded: boolean;
}

const SidebarComponent = (props: Props) => {
	const renderSynchronizeButton = (type: string) => {
		const label = type === 'sync' ? _('Synchronise') : _('Cancel');

		return (
			<StyledSynchronizeButton
				level={ButtonLevel.SidebarSecondary}
				className={`sidebar-sync-button ${type === 'sync' ? '' : '-syncing'}`}
				iconName="icon-sync"
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

	const syncReportExpanded = props.syncReportLogExpanded;

	const toggleSyncReport = useCallback(() => {
		Setting.setValue('syncReportLogExpanded', !syncReportExpanded);
	}, [syncReportExpanded]);

	const lines = Synchronizer.reportToLines(props.syncReport);
	if (resourceFetcherText) lines.push(resourceFetcherText);
	if (decryptionReportText) lines.push(decryptionReportText);

	const completedTime = props.syncReport && props.syncReport.completedTime
		? time.formatMsToLocal(props.syncReport.completedTime)
		: null;

	const syncButton = renderSynchronizeButton(props.syncStarted ? 'cancel' : 'sync');

	// Toggle to show/hide sync log output
	const toggleButton = (
		<button
			className="sidebar-sync-toggle"
			onClick={toggleSyncReport}
			aria-expanded={syncReportExpanded}
			aria-label={syncReportExpanded ? _('Hide sync log') : _('Show sync log')}
			title={syncReportExpanded ? _('Hide sync log') : _('Show sync log')}
		>
			<i className={`fas fa-caret-${syncReportExpanded ? 'down' : 'right'}`} />
			{(completedTime || props.syncStarted) ? (
				<span className="timestamp">
					{props.syncStarted ? _('Last sync: In progress...') : _('Last sync: %s', completedTime)}
				</span>
			) : ''}
		</button>
	);

	// Sync log output, only visible when expanded
	const syncReportComp = (syncReportExpanded && lines.length > 0) ? (
		<StyledSyncReport key="sync_report">
			{lines.map((line, i) => (
				<StyledSyncReportText key={i}>
					{line}
				</StyledSyncReportText>
			))}
		</StyledSyncReport>
	) : null;

	return (
		<StyledRoot className='sidebar _scrollbar2' role='navigation' aria-label={_('Sidebar')}>
			<div style={{ flex: 1 }}><FolderAndTagList /></div>
			<div style={{ flex: 0, padding: theme.mainPadding }}>
				{toggleButton}
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
		syncReportLogExpanded: state.settings.syncReportLogExpanded,
	};
};

export default connect(mapStateToProps)(SidebarComponent);
