import Logger from '@joplin/utils/Logger';

const logger = Logger.create('loadScript');

export interface Script {
	id: string;
	src: string;
	attrs?: Record<string, string>;
}

export const loadScript = async (script: Script, document: Document) => {
	return new Promise((resolve) => {
		// eslint-disable-next-line no-console
		console.info('Loading script:', script);

		let element = document.getElementById(script.id) as HTMLLinkElement | HTMLScriptElement | null;

		if (element) {
			const src = 'href' in element ? element.href : element.src;
			if (src === script.src) {
				logger.info(`Trying to load a script that has already been loaded: ${JSON.stringify(script)} - skipping it`);
				resolve(null);
			} else {
				logger.info(`Source of script has changed - reloading it: ${JSON.stringify(script)}`);
				element.parentNode.removeChild(element);
				element = null;
			}
		}

		if (script.src.indexOf('.css') >= 0) {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = script.src;
			element = link;
		} else {
			const scriptElement = document.createElement('script');
			scriptElement.src = script.src;
			if (script.attrs) {
				for (const attr in script.attrs) {
					(scriptElement as unknown as Record<string, string>)[attr] = script.attrs[attr];
				}
			}
			element = scriptElement;
		}

		element.id = script.id;

		element.onload = () => {
			resolve(null);
		};

		document.getElementsByTagName('head')[0].appendChild(element);
	});
};
