import { useEffect, useMemo } from 'react';
import bridge from '../../bridge';

export default function(postMessage: (name: string, args?: unknown)=> void, isReady: boolean, scripts: string[], cssFilePath: string) {
	const protocolHandler = useMemo(() => {
		return bridge().electronApp().getContentProtocolHandler();
	}, []);

	useEffect(() => {
		if (!isReady) return () => {};
		postMessage('setScripts', { scripts: scripts });
		const { remove } = protocolHandler.allowReadAccessToFiles(scripts);
		return remove;
	}, [scripts, isReady, postMessage, protocolHandler]);

	useEffect(() => {
		if (!isReady || !cssFilePath) return () => {};
		postMessage('setScript', { script: cssFilePath, key: 'themeCss' });
		const { remove } = protocolHandler.allowReadAccessToFile(cssFilePath);
		return remove;
	}, [isReady, cssFilePath, postMessage, protocolHandler]);
}
