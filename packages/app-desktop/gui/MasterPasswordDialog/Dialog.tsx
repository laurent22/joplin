import * as React from 'react';
import { useCallback } from 'react';
import { _ } from '@joplin/lib/locale';
import DialogButtonRow from '../DialogButtonRow';
import Dialog from '../Dialog';
import DialogTitle from '../DialogTitle';
import StyledInput from '../style/StyledInput';

interface Props {
	themeId: number;
	dispatch: Function;
}

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
			<div className="dialog-content form">
				<label>Enter your master password:</label>
				<StyledInput type="password"/>
			</div>
		);
	}

	function renderDialogWrapper() {
		return (
			<div className="dialog-root">
				<DialogTitle title={_('Master password')}/>
				{renderContent()}
				<DialogButtonRow
					themeId={props.themeId}
					onClick={onButtonRowClick}
					okButtonLabel={_('Save')}
					cancelButtonLabel={_('Close')}
				/>
			</div>
		);
	}

	return (
		<Dialog className="master-password-dialog" renderContent={renderDialogWrapper}/>
	);
}
