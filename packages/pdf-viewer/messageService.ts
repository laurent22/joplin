export default class MessageService {
	private viewerType: string;
	public constructor(type: string) {
		this.viewerType = type;
	}
	private sendMessage = (name: string, data?: any) => {
		if (this.viewerType === 'full') {
			const message = {
				name,
				...data,
			};
			window.postMessage(message, '*');
		} else if (this.viewerType === 'mini') {
			const message = {
				name,
				data,
				target: 'webview',
			};
			window.parent.postMessage(message, '*');
		}
	};
	public textSelected = (text: string) => {
		this.sendMessage('textSelected', { text });
	};
	public close = () => {
		this.sendMessage('close');
	};
	public openExternalViewer = () => {
		this.sendMessage('externalViewer');
	};

	public openFullScreenViewer = (resourceId: string, pageNo: number) => {
		this.sendMessage('openPdfViewer', { resourceId, pageNo });
	};
}
