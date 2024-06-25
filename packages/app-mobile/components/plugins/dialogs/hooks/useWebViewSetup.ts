import { useEffect } from 'react';
import { DialogWebViewApi } from '../../types';
import shim from '@joplin/lib/shim';
import { themeStyle } from '../../../../components/global-style';
import themeToCss from '@joplin/lib/services/style/themeToCss';

interface Props {
	themeId: number;
	scriptPaths: string[];
	dialogControl: DialogWebViewApi;
	pluginBaseDir: string;

	// Whenever the WebView reloads, we need to re-inject CSS and JavaScript.
	webViewLoadCount: number;
}

const useWebViewSetup = (props: Props) => {
	const { scriptPaths, dialogControl, pluginBaseDir, themeId } = props;

	useEffect(() => {
		const jsPaths = [];
		const cssPaths = [];
		for (const rawPath of scriptPaths) {
			const resolvedPath = shim.fsDriver().resolveRelativePathWithinDir(pluginBaseDir, rawPath);

			if (resolvedPath.match(/\.css$/i)) {
				cssPaths.push(resolvedPath);
			} else {
				jsPaths.push(resolvedPath);
			}
		}
		void dialogControl.includeCssFiles(cssPaths);
		void dialogControl.includeJsFiles(jsPaths);
	}, [dialogControl, scriptPaths, props.webViewLoadCount, pluginBaseDir]);

	useEffect(() => {
		const theme = themeStyle(themeId);
		const themeVariableCss = themeToCss(theme);
		void dialogControl.setThemeCss(themeVariableCss);
	}, [dialogControl, themeId, props.webViewLoadCount]);
};

export default useWebViewSetup;
