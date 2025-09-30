import { LocalizationResult } from '../../../types';
import createTextNode from './createTextNode';

type OnClick = ()=> void;

const createButton = (label: LocalizationResult, onClick: OnClick) => {
	const button = document.createElement('button');
	button.appendChild(createTextNode(label));

	button.onclick = onClick;

	return button;
};

export default createButton;
