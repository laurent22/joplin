import * as React from 'react';

import SyncWizardDialog from '../../SyncWizard/Dialog';
import MasterPasswordDialog from '../../MasterPasswordDialog/Dialog';
import EditFolderDialog from '../../EditFolderDialog/Dialog';
import PdfViewer from '../../PdfViewer';

interface RegisteredDialogProps {
	themeId: number;
	key: string;
	// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- Old code before rule was applied
	dispatch: Function;
}

interface RegisteredDialog {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Each dialog requires different customProps; the render functions intentionally spread an open shape
	render: (props: RegisteredDialogProps, customProps: any)=> React.ReactNode;
}

const appDialogs: Record<string, RegisteredDialog> = {
	syncWizard: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See RegisteredDialog.render
		render: (props: RegisteredDialogProps, customProps: any) => {
			return <SyncWizardDialog key={props.key} dispatch={props.dispatch} themeId={props.themeId} {...customProps}/>;
		},
	},

	masterPassword: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See RegisteredDialog.render
		render: (props: RegisteredDialogProps, customProps: any) => {
			return <MasterPasswordDialog key={props.key} dispatch={props.dispatch} themeId={props.themeId} {...customProps}/>;
		},
	},

	editFolder: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See RegisteredDialog.render
		render: (props: RegisteredDialogProps, customProps: any) => {
			return <EditFolderDialog key={props.key} dispatch={props.dispatch} themeId={props.themeId} {...customProps}/>;
		},
	},
	pdfViewer: {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- See RegisteredDialog.render
		render: (props: RegisteredDialogProps, customProps: any) => {
			return <PdfViewer key={props.key} dispatch={props.dispatch} themeId={props.themeId} {...customProps}/>;
		},
	},
};

export default appDialogs;
