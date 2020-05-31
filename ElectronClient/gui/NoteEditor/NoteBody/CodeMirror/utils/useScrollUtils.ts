// Helper functions to sync up scrolling
export default function useScrollUtils(CodeMirror: any) {
	function getScrollHeight(cm: any) {
		const info = cm.getScrollInfo();
		const overdraw = cm.state.scrollPastEndPadding ? cm.state.scrollPastEndPadding : '0px';
		return info.height - info.clientHeight - parseInt(overdraw);
	}

	CodeMirror.defineExtension('getScrollPercent', function() {
		const info = this.getScrollInfo();

		return info.top / getScrollHeight(this);
	});

	CodeMirror.defineExtension('setScrollPercent', function(p: number) {
		this.scrollTo(null, p * getScrollHeight(this));
	});

}
