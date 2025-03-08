import useAsyncEffect from '@joplin/lib/hooks/useAsyncEffect';
import shim from '@joplin/lib/shim';
import time from '@joplin/lib/time';
import { basename, join } from 'path';
import { useRef } from 'react';

type OnDevPluginChange = (id: string)=> void;

const useOnDevPluginsUpdated = (onDevPluginChange: OnDevPluginChange, devPluginPath: string, pluginSupportEnabled: boolean) => {
	const onDevPluginChangeRef = useRef(onDevPluginChange);
	onDevPluginChangeRef.current = onDevPluginChange;
	const isFirstUpdateRef = useRef(true);

	useAsyncEffect(async (event) => {
		if (!devPluginPath || !pluginSupportEnabled) return;

		const itemToLastModTime = new Map<string, number>();

		// publishPath should point to the publish/ subfolder of a plugin's development
		// directory.
		const checkPluginChange = async (pluginPublishPath: string) => {
			const dirStats = await shim.fsDriver().readDirStats(pluginPublishPath);
			let hasChange = false;
			let changedPluginId = '';
			for (const item of dirStats) {
				if (item.path.endsWith('.jpl')) {
					const lastModTime = itemToLastModTime.get(item.path);
					const modTime = item.mtime.getTime();
					if (lastModTime === undefined || lastModTime < modTime) {
						itemToLastModTime.set(item.path, modTime);
						hasChange = true;
						changedPluginId = basename(item.path, '.jpl');
						break;
					}
				}
			}

			if (hasChange) {
				if (isFirstUpdateRef.current) {
					// Avoid sending an event the first time the hook is called. The first iteration
					// collects initial timestamp information. In that case, hasChange
					// will always be true, even with no plugin reload.
					isFirstUpdateRef.current = false;
				} else {
					onDevPluginChangeRef.current(changedPluginId);
				}
			}
		};

		while (!event.cancelled) {
			const publishFolder = join(devPluginPath, 'publish');
			await checkPluginChange(publishFolder);

			const pollingIntervalSeconds = 5;
			await time.sleep(pollingIntervalSeconds);
		}
	}, [devPluginPath, pluginSupportEnabled]);
};

export default useOnDevPluginsUpdated;
