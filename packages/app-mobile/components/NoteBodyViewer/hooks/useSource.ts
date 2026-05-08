import { useMemo } from 'react';
import shim from '@joplin/lib/shim';
import { themeStyle } from '../../global-style';
import { PageSetupSources } from '../../../contentScripts/types';

const useSource = (rendererSource: PageSetupSources, themeId: number) => {
	const [paddingLeft, paddingRight] = useMemo(() => {
		const theme = themeStyle(themeId);
		return [theme.marginLeft, theme.marginRight];
	}, [themeId]);

	const rendererBaseCss = rendererSource.css;
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
						${rendererBaseCss}
						${shim.mobilePlatform() === 'ios' ? iOSSpecificCss : ''}
					</style>
				</head>
				<body>
					<div id="joplin-container-pluginAssetsContainer"></div>
					<div id="joplin-container-content"></div>
				</body>
			</html>
		`;
	}, [paddingLeft, paddingRight, rendererBaseCss]);

	return { html, js: rendererSource.js };
};

export default useSource;
