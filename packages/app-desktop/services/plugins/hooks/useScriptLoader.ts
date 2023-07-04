import { useEffect } from 'react';

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
export default function(postMessage: Function, isReady: boolean, scripts: string[], cssFilePath: string) {
	useEffect(() => {
		if (!isReady) return;
		postMessage('setScripts', { scripts: scripts });
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [scripts, isReady]);

	useEffect(() => {
		if (!isReady || !cssFilePath) return;
		postMessage('setScript', { script: cssFilePath, key: 'themeCss' });
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [isReady, cssFilePath]);
}
