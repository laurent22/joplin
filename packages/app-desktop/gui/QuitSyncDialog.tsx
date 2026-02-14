import * as React from 'react';
import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState } from '../app.reducer';
import { _ } from '@joplin/lib/locale';
import bridge from '../services/bridge';
import Dialog from './Dialog';
import DialogButtonRow, { ClickEvent, ButtonSpec } from './DialogButtonRow';
import styled from 'styled-components';
import { reg } from '@joplin/lib/registry';

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

const StyledSpinner = styled.div`
	margin-bottom: 16px;
	font-size: 14px;
	color: ${props => props.theme.color};
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
	useEffect(() => {
		if (showDialog && syncPending && !syncStarted) {
			void reg.scheduleSync(0);
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

	const buttonSpecs: ButtonSpec[] = [
		{ name: 'cancel', label: _('Cancel') },
		{ name: 'quitAnyway', label: _('Quit anyway') },
	];

	const dialogButtonOnClick = (event: ClickEvent) => {
		if (event.buttonName === 'cancel') {
			handleCancel(event);
		} else if (event.buttonName === 'quitAnyway') {
			handleQuitAnyway(event);
		}
	};

	return (
		<Dialog>
			<StyledContent>
				<StyledMessage>{_('Synchronising remaining changes, please wait...')}</StyledMessage>
				<StyledSpinner>{syncStarted ? _('Syncing...') : _('Starting sync...')}</StyledSpinner>
				<DialogButtonRow themeId={props.themeId} customButtons={buttonSpecs} onClick={dialogButtonOnClick} />
			</StyledContent>
		</Dialog>
	);
}