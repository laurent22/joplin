import { getCopyableContent } from './clipboardUtils';

describe('getCopyableContent', () => {
	test('should remove parameters from local images', () => {
		const localImage = 'file:///home/some/path/test.jpg';

		const content = `<div><img src="${localImage}?a=1&b=2"></div>`;
		const copyableContent = getCopyableContent(content);

		expect(copyableContent).toEqual(`<div><img src="${localImage}"></div>`);
	});

	test('should be able to process mutiple images', () => {
		const localImage1 = 'file:///home/some/path/test1.jpg';
		const localImage2 = 'file:///home/some/path/test2.jpg';
		const localImage3 = 'file:///home/some/path/test3.jpg';

		const content = `
      <div>
        <img src="${localImage1}?a=1&b=2">
        <img src="${localImage2}">
        <img src="${localImage3}?t=1">
      </div>`;

		const copyableContent = getCopyableContent(content);
		const expectedContent = `
      <div>
        <img src="${localImage1}">
        <img src="${localImage2}">
        <img src="${localImage3}">
      </div>`;

		expect(copyableContent).toEqual(expectedContent);
	});

	test('should not change parameters for images on the internet', () => {
		const image1 = 'http://www.somelink.com/image1.jpg';
		const image2 = 'https://www.somelink.com/image2.jpg';

		const content = `
      <div>
        <img src="${image1}">
        <img src="${image2}?h=12&w=15">
      </div>`;

		const copyableContent = getCopyableContent(content);

		expect(copyableContent).toEqual(content);
	});
});
