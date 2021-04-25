import Dialog from '../Dialog';
import DialogButtonRow from '../DialogButtonRow';
import DialogTitle from '../DialogTitle';
import { _ } from '@joplin/lib/locale';
import { useEffect, useState } from 'react';
import { FolderEntity } from '@joplin/lib/services/database/types';
import Folder from '@joplin/lib/models/Folder';
import ShareService from '@joplin/lib/services/share/ShareService';
import styled from 'styled-components';
import StyledFormLabel from '../style/StyledFormLabel';
import StyledInput from '../style/StyledInput';
import Button from '../Button/Button';
import Logger from '@joplin/lib/Logger';
import StyledMessage from '../style/StyledMessage';
import { StateShare, StateShareUser } from '@joplin/lib/services/share/reducer';
import { State } from '@joplin/lib/reducer';
import { connect } from 'react-redux';

const logger = Logger.create('ShareFolderDialog');

const StyledFolder = styled.div`
	border: 1px solid ${(props) => props.theme.dividerColor};
	padding: 0.5em;
	margin-bottom: 1em;
	display: flex;
	align-items: center;
`;

const StyledRecipientControls = styled.div`
	display: flex;
	flex-direction: row;
`;

const StyledRecipientInput = styled(StyledInput)`
	width: 100%;
	margin-right: 10px;
`;

const StyledAddRecipient = styled.div`
	margin-bottom: 1em;
`;

const StyledRecipients = styled.div`
	
`;

const StyledRecipientList = styled.div`
	border: 1px solid ${(props: any) => props.theme.dividerColor};
	border-radius: 3px;
	height: 300px;
	overflow-x: hidden;
	overflow-y: scroll;
`;

const StyledError = styled(StyledMessage)`
	word-break: break-all;
	margin-bottom: 1em;
`;

const StyledIcon = styled.i`
	margin-right: 8px;
`;

interface Props {
	themeId: number;
	folderId: string;
	onClose(): void;
	shares: StateShare[];
	shareUsers: Record<string, StateShareUser[]>;
}

interface AsyncEffectEvent {
	cancelled: boolean;
}

function useAsyncEffect(effect: Function, dependencies: any[]) {
	useEffect(() => {
		const event = { cancelled: false };
		effect(event);
		return () => {
			event.cancelled = true;
		};
	}, dependencies);
}

function ShareFolderDialog(props: Props) {
	const [folder, setFolder] = useState<FolderEntity>(null);
	const [recipientEmail, setRecipientEmail] = useState<string>('');
	const [latestError, setLatestError] = useState<Error>(null);
	const [share, setShare] = useState<StateShare>(null);
	const [shareUsers, setShareUsers] = useState<StateShareUser[]>([]);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const f = await Folder.load(props.folderId);
		if (event.cancelled) return;
		setFolder(f);
	}, [props.folderId]);

	useEffect(() => {
		void ShareService.instance().refreshShares();
	}, []);

	useEffect(() => {
		const s = props.shares.find(s => s.folder_id === props.folderId);
		setShare(s);
	}, [props.shares]);

	useEffect(() => {
		if (!share) return;
		void ShareService.instance().refreshShareUsers(share.id);
	}, [share]);

	useEffect(() => {
		if (!share) return;
		const sus = props.shareUsers[share.id];
		if (!sus) return;
		setShareUsers(sus);
	}, [share, props.shareUsers]);

	useEffect(() => {
		void ShareService.instance().refreshShares();
	}, [props.folderId]);

	async function shareRecipient_click() {
		try {
			setLatestError(null);
			const share = await ShareService.instance().shareFolder(props.folderId);
			await ShareService.instance().addShareRecipient(share.id, recipientEmail);
		} catch (error) {
			logger.error(error);
			setLatestError(error);
		}
	}

	async function recipientEmail_change(event: any) {
		setRecipientEmail(event.target.value);
	}

	function renderFolder() {
		return (
			<StyledFolder>
				<StyledIcon className="icon-notebooks"/>{folder ? folder.title : '...'}
			</StyledFolder>
		);
	}

	function renderAddRecipient() {
		return (
			<StyledAddRecipient>
				<StyledFormLabel>{_('Add recipient:')}</StyledFormLabel>
				<StyledRecipientControls>
					<StyledRecipientInput type="email" placeholder="example@domain.com" value={recipientEmail} onChange={recipientEmail_change} />
					<Button title={_('Share')} onClick={shareRecipient_click}></Button>
				</StyledRecipientControls>
			</StyledAddRecipient>
		);
	}

	function renderRecipient(shareUser: StateShareUser) {
		return (
			<StyledMessage key={shareUser.user.email}>
				{shareUser.user.email}
			</StyledMessage>
		);
	}

	function renderRecipients() {
		const listItems = shareUsers.map(su => renderRecipient(su));

		return (
			<StyledRecipients>
				<StyledFormLabel>{_('Recipients:')}</StyledFormLabel>
				<StyledRecipientList>
					{listItems}
				</StyledRecipientList>
			</StyledRecipients>
		);
	}

	function renderError() {
		if (!latestError) return null;

		return (
			<StyledError type="error">
				{latestError.message}
			</StyledError>
		);
	}

	function buttonRow_click() {
		props.onClose();
	}

	function renderContent() {
		return (
			<div>
				<DialogTitle title={_('Share Notebook')}/>
				{renderFolder()}
				{renderAddRecipient()}
				{renderError()}
				{renderRecipients()}
				<DialogButtonRow themeId={props.themeId} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		);
	}

	return (
		<Dialog renderContent={renderContent}/>
	);
}

const mapStateToProps = (state: State) => {
	return {
		shares: state.shareService.shares,
		shareUsers: state.shareService.shareUsers,
	};
};

export default connect(mapStateToProps)(ShareFolderDialog as any);
