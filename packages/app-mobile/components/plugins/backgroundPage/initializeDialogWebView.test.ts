/** @jest-environment jsdom */
import { DialogWebViewApi } from '../types';
import initializeDialogWebView from './initializeDialogWebView';

let mockDialogApi: DialogWebViewApi;
jest.mock('../../../utils/ipc/WebViewToRNMessenger', () => {
	return class {
		public remoteApi = {
			postMessage: jest.fn(),
			onMessage: jest.fn(),
			onError: jest.fn(),
			onLog: jest.fn(),
		};

		public constructor(_messageChannelId: string, localApi: DialogWebViewApi) {
			mockDialogApi = localApi;
		}
	};
});
jest.mock('./utils/reportUnhandledErrors', () => jest.fn());
jest.mock('./utils/wrapConsoleLog', () => jest.fn());

class MockResizeObserver {
	public static instances: MockResizeObserver[] = [];
	public observe = jest.fn();
	public disconnect = jest.fn();

	public constructor(private callback: ResizeObserverCallback) {
		MockResizeObserver.instances.push(this);
	}

	public notify() {
		this.callback([], this as unknown as ResizeObserver);
	}
}

describe('initializeDialogWebView', () => {
	let contentWidth = 0;
	let contentHeight = 0;
	let viewportWidth = 0;
	let innerWidth = 0;

	beforeEach(() => {
		MockResizeObserver.instances = [];
		global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;
		document.body.innerHTML = '<div id="joplin-plugin-content"></div>';

		const content = document.getElementById('joplin-plugin-content');
		Object.defineProperty(content, 'clientWidth', { configurable: true, get: () => contentWidth });
		Object.defineProperty(content, 'clientHeight', { configurable: true, get: () => contentHeight });
		Object.defineProperty(document.documentElement, 'clientWidth', { configurable: true, get: () => viewportWidth });
		Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => innerWidth });

		contentWidth = 320;
		contentHeight = 200;
		viewportWidth = 1000;
		innerWidth = 1000;
		initializeDialogWebView('test-channel');
	});

	afterEach(() => {
		window.dispatchEvent(new Event('pagehide'));
	});

	test('should report width reductions observed without DOM mutations', async () => {
		expect(await mockDialogApi.getContentSize(true)).toMatchObject({ width: 320, height: 200 });

		contentWidth = 220;
		MockResizeObserver.instances[0].notify();

		expect(await mockDialogApi.getContentSize(true)).toMatchObject({ width: 220, height: 200 });
	});

	test('should remain stable while dialog text changes continuously', async () => {
		contentWidth = 300;
		viewportWidth = 300;
		innerWidth = 315;
		expect(await mockDialogApi.getContentSize(true)).toMatchObject({ width: 315, height: 200 });

		for (let i = 0; i < 5; i++) {
			document.getElementById('joplin-plugin-content').textContent = `Update ${i}`;
			contentHeight++;
			MockResizeObserver.instances[0].notify();
			expect(await mockDialogApi.getContentSize(true)).toMatchObject({ width: 315, height: 201 + i });
		}
	});

	test('should only observe while watching for size changes', async () => {
		await mockDialogApi.getContentSize(false);
		expect(MockResizeObserver.instances).toHaveLength(0);

		await mockDialogApi.getContentSize(true);
		expect(MockResizeObserver.instances[0].observe).toHaveBeenCalledWith(
			document.getElementById('joplin-plugin-content'),
			{ box: 'border-box' },
		);

		await mockDialogApi.getContentSize(false);
		expect(MockResizeObserver.instances[0].disconnect).toHaveBeenCalledTimes(1);

		await mockDialogApi.getContentSize(true);
		window.dispatchEvent(new Event('pagehide'));
		expect(MockResizeObserver.instances[1].disconnect).toHaveBeenCalledTimes(1);
	});
});
