import * as React from 'react';
import { useRef, useCallback } from 'react';
import { ButtonSpec, DialogResult } from '@joplin/lib/services/plugins/api/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import WebviewController from '@joplin/lib/services/plugins/WebviewController';
import UserWebview, { Props as UserWebviewProps } from './UserWebview';
import UserWebviewDialogButtonBar from './UserWebviewDialogButtonBar';
import { focus } from '@joplin/lib/utils/focusHandler';
import Dialog from '../../gui/Dialog';

interface Props extends UserWebviewProps {
	buttons: ButtonSpec[];
	fitToContent: boolean;
}

function defaultButtons(): ButtonSpec[] {
	return [
		{
			id: 'ok',
		},
		{
			id: 'cancel',
		},
	];
}

function findSubmitButton(buttons: ButtonSpec[]): ButtonSpec | null {
	return buttons.find((b: ButtonSpec) => {
		return ['ok', 'yes', 'confirm', 'submit'].includes(b.id);
	});
}

function findDismissButton(buttons: ButtonSpec[]): ButtonSpec | null {
	return buttons.find((b: ButtonSpec) => {
		return ['cancel', 'no', 'reject'].includes(b.id);
	});
}

export default function UserWebviewDialog(props: Props) {
	const webviewRef = useRef(null);

	function viewController(): WebviewController {
		return PluginService.instance().pluginById(props.pluginId).viewController(props.viewId) as WebviewController;
	}

	const buttons: ButtonSpec[] = (props.buttons ? props.buttons : defaultButtons()).map((b: ButtonSpec) => {
		return {
			...b,
			onClick: () => {
				const response: DialogResult = { id: b.id };
				const formData = webviewRef.current.formData();
				if (formData && Object.keys(formData).length) response.formData = formData;
				viewController().closeWithResponse(response);
			},
		};
	});

	const onSubmit = useCallback(() => {
		const submitButton = findSubmitButton(buttons);
		if (submitButton) {
			submitButton.onClick();
		}
	}, [buttons]);

	const onDismiss = useCallback(() => {
		const dismissButton = findDismissButton(buttons);
		if (dismissButton) {
			dismissButton.onClick();
		}
	}, [buttons]);

	const onReady = useCallback(() => {
		// We focus the dialog once it's ready to make sure that the ESC/Enter
		// keyboard shortcuts are working.
		// https://github.com/laurent22/joplin/issues/4474
		if (webviewRef.current) focus('UserWebviewDialog', webviewRef.current);
	}, []);

	return (
		<Dialog className={`user-webview-dialog ${props.fitToContent ? '-fit' : ''}`}>
			<div className='user-dialog-wrapper'>
				<UserWebview
					ref={webviewRef}
					html={props.html}
					scripts={props.scripts}
					pluginId={props.pluginId}
					viewId={props.viewId}
					themeId={props.themeId}
					borderBottom={false}
					fitToContent={props.fitToContent}
					onSubmit={onSubmit}
					onDismiss={onDismiss}
					onReady={onReady}
				/>
			</div>
			<UserWebviewDialogButtonBar buttons={buttons}/>
		</Dialog>
	);
}
