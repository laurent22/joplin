// Helper functions to sync up scrolling
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
export default function useScrollUtils(CodeMirror: any) {
	CodeMirror.defineExtension('getScrollPercent', function() {
		const info = this.getScrollInfo();
		return info.top / (info.height - info.clientHeight);
	});

	CodeMirror.defineExtension('setScrollPercent', function(p: number) {
		const info = this.getScrollInfo();
		this.scrollTo(null, p * (info.height - info.clientHeight));
	});
}
