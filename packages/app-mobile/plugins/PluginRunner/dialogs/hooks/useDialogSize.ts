import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { useState } from 'react';
import { DialogContentSize, DialogWebViewApi } from '../../types';

interface Props {
	dialogControl: DialogWebViewApi;
	webViewLoadCount: number;
}

const useDialogSize = (props: Props) => {
	const { dialogControl, webViewLoadCount } = props;

	const [dialogSize, setDialogSize] = useState<DialogContentSize|null>(null);
	useAsyncEffect(async event => {
		if (!dialogControl) {
			// May happen if the webview is still loading.
			return;
		}

		const contentSize = await dialogControl.getContentSize();
		if (event.cancelled) return;

		setDialogSize(contentSize);
	}, [dialogControl, setDialogSize, webViewLoadCount]);

	return dialogSize;
};

export default useDialogSize;
