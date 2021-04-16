import htmlUtils from './htmlUtils';

describe('HTML Utils', () => {
	test('should correctly replace source in image tags asynchronously', async () => {
		const testHtml = `
        <p>test 1</p>
        <img src="https://www.test1url.com/">
        <p>test 2</p>
        <img src="https://www.test2url.com/">
        `;

		const callbackFcn = async (x: string) => {
			return await `${x}image.png`;
		};

		const replacedHtml = await htmlUtils.replaceImageUrlsAsync(testHtml, callbackFcn);
		const expctedHtml = `
        <p>test 1</p>
        <img src="https://www.test1url.com/image.png">
        <p>test 2</p>
        <img src="https://www.test2url.com/image.png">
        `;

		expect(replacedHtml).toEqual(expctedHtml);
	});
});
