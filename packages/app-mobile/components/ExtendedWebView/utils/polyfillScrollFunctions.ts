const polyfillScrollFunctions = `
	if (!window.scrollBy) {
		window.scrollBy = (_amount) => { };
	}
	if (!Element.prototype.scrollIntoView) {
		Element.prototype.scrollIntoView = function() { };
	}
`;

export default polyfillScrollFunctions;
