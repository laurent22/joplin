import * as React from 'react';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../app.reducer';
import { _ } from '@joplin/lib/locale';
import bridge from '../services/bridge';
import Dialog from '@joplin/lib/components/Dialog';
import DialogButtonRow, { ClickEvent } from './DialogButtonRow';
import styled from 'styled-components';
import { reg } from '@joplin/lib/registry';
import Synchronizer from '@joplin/lib/Synchronizer';

interface Props {
	themeId: number;
}

const StyledContent = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20px;
	min-width: 300px;
`;

const StyledMessage = styled.div`
	margin-bottom: 16px;
	text-align: center;
`;

export default function QuitSyncDialog(props: Props) {
	const dispatch = useDispatch();
	const showDialog = useSelector((state: AppState) => state.showQuitSyncDialog);
	const syncPending = useSelector((state: AppState) => state.syncPending);
	const syncStarted = useSelector((state: AppState) => state.syncStarted);

	// Auto-quit when sync completes
	useEffect(() => {
		if (showDialog && !syncPending) {
			dispatch({ type: 'QUIT_SYNC_DIALOG_CLOSE' });
			void bridge().electronApp().quit();
		}
	}, [showDialog, syncPending, dispatch]);

	// Trigger immediate sync when dialog opens if not already syncing
	// If the sync process schedules another sync automatically, this hook will trigger another sync immediately, instead of having to wait the syncAsYouTypeInterval
	// That is because this triggers when sync completed is emitted, but if another sync is not scheduled, the app quits via the other hook when syncPending is reset to false just after
	useEffect(() => {
		if (showDialog && syncPending && !syncStarted) {
			void reg.scheduleSync(0, { syncSteps: Synchronizer.partialSyncSteps });
		}
	}, [showDialog, syncPending, syncStarted]);

	if (!showDialog) return null;

	const handleCancel = (_event: ClickEvent) => {
		dispatch({ type: 'QUIT_SYNC_DIALOG_CLOSE' });
	};

	const handleQuitAnyway = (_event: ClickEvent) => {
		dispatch({ type: 'QUIT_SYNC_DIALOG_CLOSE' });
		void bridge().electronApp().quit();
	};

	const dialogButtonOnClick = (event: ClickEvent) => {
		if (event.buttonName === 'ok') {
			handleQuitAnyway(event);
		} else if (event.buttonName === 'cancel') {
			handleCancel(event);
		}
	};

	return (
		<Dialog>
			<StyledContent>
				<StyledMessage>{_('Synchronising remaining changes, please wait...')}</StyledMessage>
				<DialogButtonRow themeId={props.themeId} onClick={dialogButtonOnClick} okButtonLabel={_('Quit anyway')} cancelButtonLabel={_('Cancel')} />
			</StyledContent>
		</Dialog>
	);
}
