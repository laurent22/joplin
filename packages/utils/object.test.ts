import { objectValueFromPath } from './object';

describe('object', () => {

	test.each([
		[
			{
				note: {
					id: '123',
					title: 'my note',
				},
			},
			'note.title',
			'my note',
		],
		[
			{
				note: {
					id: '123',
					title: 'my note',
				},
			},
			'note.doesntexist',
			undefined,
		],
	])('should extract URLs', (object, path, expected) => {
		const actual = objectValueFromPath(object, path);
		expect(actual).toBe(expected);
	});

});
