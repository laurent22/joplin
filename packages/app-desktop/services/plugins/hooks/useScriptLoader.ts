import { useEffect } from 'react';

export default function(postMessage: Function, isReady: boolean, scripts: string[], cssFilePath: string) {
	useEffect(() => {
		if (!isReady) return;
		postMessage('setScripts', { scripts: scripts });
	}, [scripts, isReady]);

	useEffect(() => {
		if (!isReady || !cssFilePath) return;
		postMessage('setScript', { script: cssFilePath, key: 'themeCss' });
	}, [isReady, cssFilePath]);
}
