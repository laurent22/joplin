import * as React from 'react';
import { AppStateDialog } from '../../app.reducer';
import appDialogs from './utils/appDialogs';
import { Dispatch } from 'redux';

interface Props {
	themeId: number;
	dispatch: Dispatch;
	appDialogStates: AppStateDialog[];
}

const AppDialogs: React.FC<Props> = props => {
	if (!props.appDialogStates.length) return null;

	const output: React.ReactNode[] = [];
	for (const dialog of props.appDialogStates) {
		const md = appDialogs[dialog.name];
		if (!md) throw new Error(`Unknown dialog: ${dialog.name}`);
		output.push(md.render({
			key: dialog.name,
			themeId: props.themeId,
			dispatch: props.dispatch,
		}, dialog.props));
	}
	return <>{output}</>;
};

export default AppDialogs;
