'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const react_1 = require('react');
const useItemEventHandlers = (rootElement, itemElement, onInputChange, onClick) => {
	(0, react_1.useEffect)(() => {
		if (!itemElement) { return () => { }; }
		const inputs = itemElement.getElementsByTagName('input');
		const processedCheckboxes = [];
		const processedTextInputs = [];
		for (const input of inputs) {
			if (input.type === 'checkbox') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				input.addEventListener('change', onInputChange);
				processedCheckboxes.push(input);
			}
			if (input.type === 'text') {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				input.addEventListener('change', onInputChange);
				processedTextInputs.push(input);
			}
		}
		const buttons = itemElement.getElementsByTagName('button');
		const processedButtons = [];
		if (onClick) {
			for (const button of buttons) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				button.addEventListener('click', onClick);
				processedButtons.push(button);
			}
		}
		return () => {
			for (const input of processedCheckboxes) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				input.removeEventListener('change', onInputChange);
			}
			for (const input of processedTextInputs) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				input.removeEventListener('change', onInputChange);
			}
			for (const button of processedButtons) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
				button.removeEventListener('click', onClick);
			}
		};
	}, [itemElement, rootElement, onInputChange, onClick]);
};
exports.default = useItemEventHandlers;
// # sourceMappingURL=useItemEventHandlers.js.map
