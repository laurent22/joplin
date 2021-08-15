import * as React from 'react';
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
`;

export default function(props: Props) {
	const onButtonRowClick = () => {
		props.dispatch({
			type: 'DIALOG_CLOSE',
			name: 'syncWizard',
		});
	};

	function renderContent() {
		return (
			<StyledRoot>
				<DialogTitle title={_('Synchronisation Wizard')}/>
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonShow={false}
					cancelButtonLabel={_('Close')}
				/>
			</StyledRoot>
		);
	}

	return (
		<Dialog renderContent={renderContent}/>
	);
}
