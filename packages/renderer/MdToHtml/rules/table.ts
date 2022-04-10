function plugin(markdownIt: any) {
	markdownIt.renderer.rules.table_open = function () {
		return `<div style="overflow: auto;"><table>`
	};
	markdownIt.renderer.rules.table_close = function () {
		return `</table></div>`
	};
}

export default {
	plugin,
};
