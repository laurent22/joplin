// Helper functions to sync up scrolling
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Receives dynamically-loaded CodeMirror 5 namespace; @types/codemirror's signature is too narrow for defineExtension
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
