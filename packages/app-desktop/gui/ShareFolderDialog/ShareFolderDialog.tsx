import Dialog from '../Dialog';
import DialogButtonRow from '../DialogButtonRow';
import DialogTitle from '../DialogTitle';
import { _ } from '@joplin/lib/locale';
import { useEffect, useState } from 'react';
import { FolderEntity } from '@joplin/lib/services/database/types';
import Folder from '@joplin/lib/models/Folder';
import styled from 'styled-components';
import StyledFormLabel from '../style/StyledFormLabel';
import StyledInput from '../style/StyledInput';

const StyledFolder = styled.div`
	border: 1px solid ${(props) => props.theme.dividerColor};
	padding: 0.5em;
	margin-bottom: 1em;
	display: flex;
	align-items: center;
`;

const StyledRecipientInput = styled(StyledInput)`
	width: 100%;
`;

const StyledAddRecipient = styled.div`
	margin-bottom: 1em;
`;

const StyledRecipients = styled.div`

`;

const StyledIcon = styled.i`
	margin-right: 8px;
`;

interface Props {
	themeId: number;
	folderId: string;
	onClose(): void;
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

export default function(props: Props) {
	const [folder, setFolder] = useState<FolderEntity>(null);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const f = await Folder.load(props.folderId);
		if (event.cancelled) return;
		setFolder(f);
	}, [props.folderId]);

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
				<StyledRecipientInput type="email" placeholder="example@domain.com"></StyledRecipientInput>
			</StyledAddRecipient>
		);
	}

	function renderRecipients() {
		return (
			<StyledRecipients>
				<StyledFormLabel>{_('Recipients:')}</StyledFormLabel>
			</StyledRecipients>
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
				{renderRecipients()}
				<DialogButtonRow themeId={props.themeId} onClick={buttonRow_click} okButtonShow={false} cancelButtonLabel={_('Close')}/>
			</div>
		);
	}

	return (
		<Dialog renderContent={renderContent}/>
	);
}
