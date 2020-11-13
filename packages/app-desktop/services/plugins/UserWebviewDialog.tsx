import { ButtonSpec } from '@joplin/lib/services/plugins/api/types';
import PluginService from '@joplin/lib/services/plugins/PluginService';
import WebviewController from '@joplin/lib/services/plugins/WebviewController';
import * as React from 'react';
import UserWebview, { Props as UserWebviewProps } from './UserWebview';
import UserWebviewDialogButtonBar from './UserWebviewDialogButtonBar';
const styled = require('styled-components').default;

interface Props extends UserWebviewProps {
	buttons: ButtonSpec[];
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

export default function UserWebviewDialog(props: Props) {
	function viewController(): WebviewController {
		return PluginService.instance().pluginById(props.pluginId).viewController(props.viewId) as WebviewController;
	}

	const buttons: ButtonSpec[] = (props.buttons ? props.buttons : defaultButtons()).map((b: ButtonSpec) => {
		return {
			...b,
			onClick: () => {
				viewController().closeWithResponse(b.id);
			},
		};
	});

	return (
		<StyledRoot>
			<Dialog>
				<UserWebViewWrapper>
					<UserWebview
						html={props.html}
						scripts={props.scripts}
						onMessage={props.onMessage}
						pluginId={props.pluginId}
						viewId={props.viewId}
						themeId={props.themeId}
						borderBottom={false}
						fitToContent={true}
					/>
				</UserWebViewWrapper>
				<UserWebviewDialogButtonBar buttons={buttons}/>
			</Dialog>
		</StyledRoot>
	);
}
