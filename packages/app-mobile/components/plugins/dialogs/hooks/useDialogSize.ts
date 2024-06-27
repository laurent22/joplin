import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import { useRef, useState } from 'react';
import { DialogContentSize, DialogWebViewApi } from '../../types';
import { PixelRatio } from 'react-native';

interface Props {
	dialogControl: DialogWebViewApi;
	webViewLoadCount: number;
	watchForSizeChanges: boolean;
}

const useDialogSize = (props: Props) => {
	const { dialogControl, webViewLoadCount } = props;

	const [dialogSize, setDialogSize] = useState<DialogContentSize|null>(null);
	const lastSizeRef = useRef(dialogSize);
	lastSizeRef.current = dialogSize;
	useAsyncEffect(async event => {
		if (!dialogControl) {
			// May happen if the webview is still loading.
			return;
		}

		while (!event.cancelled) {
			const contentSize = await dialogControl.getContentSize();
			if (event.cancelled) return;

			const lastSize = lastSizeRef.current;
			if (contentSize.width !== lastSize?.width || contentSize.height !== lastSize?.height) {
				// We use 1000 here because getPixelSizeForLayoutSize is guaranteed to return
				// an integer.
				const pixelToDpRatio = 1000 / PixelRatio.getPixelSizeForLayoutSize(1000);
				setDialogSize({
					width: contentSize.width * pixelToDpRatio,
					height: contentSize.height * pixelToDpRatio,
				});
			}

			if (!props.watchForSizeChanges) return;

			await new Promise<void>(resolve => {
				setTimeout(() => {
					resolve();
				}, 500);
			});
		}
	}, [dialogControl, setDialogSize, webViewLoadCount]);

	return dialogSize;
};

export default useDialogSize;
