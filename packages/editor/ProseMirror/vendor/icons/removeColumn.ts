import icon from "./icon";

export default () => {
	const element = icon(require('./variableRemove.svg'))();
	element.style.transform = 'rotate(90deg)';
	return element;
};
