import { useMemo } from 'react';
import shim from '@joplin/lib/shim';
import Setting from '@joplin/lib/models/Setting';
import { RendererWebViewOptions } from '../bundledJs/types';
import { themeStyle } from '../../global-style';
import { Platform } from 'react-native';

const useSource = (tempDirPath: string, themeId: number) => {
	const injectedJs = useMemo(() => {
		const subValues = Setting.subValues('markdown.plugin', Setting.toPlainObject());
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
		const pluginOptions: any = {};
		for (const n in subValues) {
			pluginOptions[n] = { enabled: subValues[n] };
		}

		const rendererWebViewOptions: RendererWebViewOptions = {
			settings: {
				safeMode: Setting.value('isSafeMode'),
				tempDir: tempDirPath,
				resourceDir: Setting.value('resourceDir'),
				resourceDownloadMode: Setting.value('sync.resourceDownloadMode'),
			},
			// Web needs files to be transferred manually, since image SRCs can't reference
			// the Origin Private File System.
			useTransferredFiles: Platform.OS === 'web',
			pluginOptions,
		};

		return `
			window.rendererWebViewOptions = ${JSON.stringify(rendererWebViewOptions)};

			if (!window.injectedJsLoaded) {
				window.injectedJsLoaded = true;

				${shim.injectedJs('webviewLib')}
				${shim.injectedJs('noteBodyViewerBundle')}
			}
		`;
	}, [tempDirPath]);

	const [paddingLeft, paddingRight] = useMemo(() => {
		const theme = themeStyle(themeId);
		return [theme.marginLeft, theme.marginRight];
	}, [themeId]);

	const html = useMemo(() => {
		// iOS doesn't automatically adjust the WebView's font size to match users'
		// accessibility settings. To do this, we need to tell it to match the system font.
		// See https://github.com/ionic-team/capacitor/issues/2748#issuecomment-612923135
		const iOSSpecificCss = `
			@media screen {
				:root body {
					font: -apple-system-body;
				}
			}
		`;
		const defaultCss = `
			code {
				white-space: pre-wrap;
				overflow-x: hidden;
			}

			body {
				padding-left: ${Number(paddingLeft)}px;
				padding-right: ${Number(paddingRight)}px;
			}
		`;

		return `
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1">
					<style>
						${defaultCss}
						${shim.mobilePlatform() === 'ios' ? iOSSpecificCss : ''}
					</style>
				</head>
				<body>
					<div id="joplin-container-pluginAssetsContainer"></div>
					<div id="joplin-container-content"></div>
				</body>
			</html>
		`;
	}, [paddingLeft, paddingRight]);

	return { html, injectedJs };
};

export default useSource;
