import * as React from 'react';
import { useRef, useCallback } from 'react';
import { ButtonSpec, DialogResult } from '@joplin/lib/services/plugins/api/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import WebviewController from '@joplin/lib/services/plugins/WebviewController';
import UserWebview, { Props as UserWebviewProps } from './UserWebview';
import UserWebviewDialogButtonBar from './UserWebviewDialogButtonBar';
const styled = require('styled-components').default;

interface Props extends UserWebviewProps {
	buttons: ButtonSpec[];
	fitToContent: boolean;
}

const StyledRoot = styled.div`
	display: flex;
	flex: 1;
	padding: 0;
	margin: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0,0,0,0.5);
	box-sizing: border-box;
	justify-content: center;
	align-items: center;
`;

const Dialog = styled.div`
	display: flex;
	flex-direction: column;
	background-color: ${(props: any) => props.theme.backgroundColor};
	padding: ${(props: any) => `${props.theme.mainPadding}px`};
	border-radius: 4px;
	box-shadow: 0 6px 10px #00000077;
	width: ${(props: any) => props.fitToContent ? 'auto' : '90vw'};
	height: ${(props: any) => props.fitToContent ? 'auto' : '80vh'};
`;

const UserWebViewWrapper = styled.div`
	display: flex;
	flex: 1;
`;

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
		if (webviewRef.current) webviewRef.current.focus();
	}, []);

	return (
		<StyledRoot>
			<Dialog fitToContent={props.fitToContent}>
				<UserWebViewWrapper>
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
				</UserWebViewWrapper>
				<UserWebviewDialogButtonBar buttons={buttons}/>
			</Dialog>
		</StyledRoot>
	);
}
