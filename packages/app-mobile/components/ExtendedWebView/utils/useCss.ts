import { useEffect } from 'react';

type OnInjectJs = (js: string)=> void;

const webViewCssClassName = 'extended-webview-css';

const applyCssJs = (css: string) => `
(function() {
	const styleId = ${JSON.stringify(webViewCssClassName)};

	const oldStyle = document.getElementById(styleId);
	if (oldStyle) {
		oldStyle.remove();
	}

	const style = document.createElement('style');
	style.setAttribute('id', styleId);

	style.appendChild(document.createTextNode(${JSON.stringify(css)}));
	document.head.appendChild(style);
})();

true;
`;

const useCss = (injectJs: OnInjectJs|null, css: string) => {
	useEffect(() => {
		if (injectJs && css) {
			injectJs(applyCssJs(css));
		}
	}, [injectJs, css]);

	return {
		injectedJs: css ? applyCssJs(css) : '',
	};
};

export default useCss;
