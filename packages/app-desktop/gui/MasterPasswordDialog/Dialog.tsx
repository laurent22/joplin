import * as React from 'react';
import { useCallback } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow from '../DialogButtonRow';
import Dialog from '../Dialog';
import styled from 'styled-components';
import DialogTitle from '../DialogTitle';

interface Props {
	themeId: number;
	dispatch: Function;
}

const StyledRoot = styled.div`
	min-width: 500px;
	max-width: 1200px;
`;

const ContentRoot = styled.div`
	background-color: ${props => props.theme.backgroundColor3};
	padding: 1em;
	padding-right: 0;
`;

export default function(props: Props) {
	function closeDialog(dispatch: Function) {
		dispatch({
			type: 'DIALOG_CLOSE',
			name: 'masterPassword',
		});
	}

	const onButtonRowClick = useCallback(() => {
		closeDialog(props.dispatch);
	}, [props.dispatch]);

	function renderContent() {
		return (
			<ContentRoot>
				aaaaaaaaaa
			</ContentRoot>
		);
	}

	function renderDialogWrapper() {
		return (
			<StyledRoot>
				<DialogTitle title={_('Master password')}/>
				{renderContent()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonLabel={_('Save')}
					cancelButtonLabel={_('Close')}
				/>
			</StyledRoot>
		);
	}

	return (
		<Dialog renderContent={renderDialogWrapper}/>
	);
}
