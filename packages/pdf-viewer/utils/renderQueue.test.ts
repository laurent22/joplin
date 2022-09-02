import RenderQueue from './renderQueue';
import { RenderRequest, RenderResult } from '../types';

class MockedRenderer {
	private successCount = 0;
	private failedCount = 0;
	public constructor(successCount: number, failedCount: number) {
		this.successCount = successCount;
		this.failedCount = failedCount;
	}
	public async render(_params: RenderRequest): Promise<RenderResult> {
		return new Promise((resolve, reject) => {
			setTimeout(() => {
				if (this.successCount > 0) {
					this.successCount--;
					resolve({} as RenderResult);
				} else if (this.failedCount > 0) {
					this.failedCount--;
					reject(new Error('Error'));
				}
			}, 200);
		});
	}
}


describe('renderQueue', () => {

	test('Should execute all tasks', async () => {
		const renderer = new MockedRenderer(3, 2);
		const queue = new RenderQueue(renderer.render);
		let successCount = 0;
		for (let i = 0; i < 3; i++) {
			queue.addTask({
				params: {} as RenderRequest,
				resolve: () => {
					successCount++;
				},
				reject: jest.fn(),
			});
		}
		setTimeout(() => {
			expect(successCount).toBe(3);
		}, 1500);
	});

});
