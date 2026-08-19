import { LocalizationResult } from '../../../types';
import createTextNode from './createTextNode';

type OnClick = ()=> void;

type Content = LocalizationResult|{
	icon: Element;
	label: LocalizationResult;
};

const isLocalizationResult = (content: Content): content is LocalizationResult => {
	return typeof content === 'string' || !('icon' in content);
};

const createButton = (content: Content, onClick: OnClick) => {
	const button = document.createElement('button');
	if (isLocalizationResult(content)) {
		button.appendChild(createTextNode(content));
	} else {
		button.appendChild(content.icon);

		void (async () => {
			const label = await content.label;
			button.ariaLabel = label;
			button.title = label;
		})();
	}

	button.onclick = onClick;

	return button;
};

export default createButton;
