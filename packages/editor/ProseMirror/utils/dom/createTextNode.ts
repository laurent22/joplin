import { LocalizationResult } from '../../../types';

const createTextNode = (content: LocalizationResult) => {
	const result = document.createTextNode(typeof content === 'string' ? content : '...');
	void (async () => {
		result.textContent = await content;
	})();
	return result;
};

export default createTextNode;
