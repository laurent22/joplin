import { resourceInfo, ContextMenuOptions, ContextMenuItemType } from './contextMenuUtils';

jest.mock('@joplin/lib/models/Resource');

describe('contextMenu', () => {
	it('should provide proper copy path', async () => {
		const testCases: Array<[ContextMenuOptions, string]> = [
			[
				{
					itemType: ContextMenuItemType.Image,
					resourceId: null,
					tempResource: {
						data: '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve">test</svg>',
						mime: 'image/svg+xml',
						filename: 'Mermaid export.svg',
					},
					linkToCopy: null,
					textToCopy: null,
					htmlToCopy: null,
					insertContent: () => { },
				},
				'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4bWw6c3BhY2U9InByZXNlcnZlIj50ZXN0PC9zdmc+',
			],
		];

		for (const testCase of testCases) {
			const [inputObj, expectedText] = testCase;
			const { getCopyPath } = await resourceInfo(inputObj);
			expect(getCopyPath()).toBe(expectedText);
		}
	});
});
