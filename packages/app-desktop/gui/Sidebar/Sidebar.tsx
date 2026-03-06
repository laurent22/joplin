import * as React from 'react';
import { useState, useCallback } from 'react';
import { StyledSyncReportText, StyledSyncReport, StyledSynchronizeButton, StyledRoot, StyledSyncReportToggle } from './styles';
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

	const [syncReportExpanded, setSyncReportExpanded] = useState(false);

	const toggleSyncReport = useCallback(() => {
		setSyncReportExpanded(prev => !prev);
	}, []);

	const lines = Synchronizer.reportToLines(props.syncReport);
	if (resourceFetcherText) lines.push(resourceFetcherText);
	if (decryptionReportText) lines.push(decryptionReportText);

	const syncButton = renderSynchronizeButton(props.syncStarted ? 'cancel' : 'sync');

	// Toggle to show/hide the sync panel
	const toggleButton = (
		<StyledSyncReportToggle
			onClick={toggleSyncReport}
			aria-expanded={syncReportExpanded}
			aria-label={syncReportExpanded ? _('Hide synchronisation panel') : _('Show synchronisation panel')}
			title={syncReportExpanded ? _('Hide synchronisation panel') : _('Show synchronisation panel')}
		>
			<i className={`fas fa-caret-${syncReportExpanded ? 'down' : 'up'}`} />
		</StyledSyncReportToggle>
	);

	// Sync panel (report + button), only visible when expanded
	const syncPanelContent = syncReportExpanded ? (
		<>
			{lines.length > 0 && (
				<StyledSyncReport key="sync_report">
					{lines.map((line, i) => (
						<StyledSyncReportText key={i}>
							{line}
						</StyledSyncReportText>
					))}
				</StyledSyncReport>
			)}
			{syncButton}
		</>
	) : null;

	return (
		<StyledRoot className='sidebar _scrollbar2' role='navigation' aria-label={_('Sidebar')}>
			<div style={{ flex: 1 }}><FolderAndTagList /></div>
			<div style={{ flex: 0, padding: theme.mainPadding }}>
				{toggleButton}
				{syncPanelContent}
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
