const moveToFolder = require('./moveToFolder');


describe('AddOptions: Test The Path of Folders', () => {

	const options = new moveToFolder.AddOptions();

	beforeEach(() => {
		options.startFolders = [];
	});

	it('Empty Notebook Title', () => {
		const testCases = [{ id: 1, title: '' }];

		options.addOptions(testCases, '');
		const data = options.startFolders;
		expect(data[0].label).toEqual('Untitled');

	});

	it('Diffrent Paths', () => {
		const testCases = [{ id: 8, title: 'my Note' }, { id: 2, title: 'first', children: [{ id: 3, title: 'second', children: [{ id: 4, title: 'third', children: [{ id: 5, title: 'fourth' }] }, { id: 6, title: 'fourth' }] }, { id: 7, title: 'fourth' }] }];
		const answers = ['my Note', 'first', 'first/second', 'first/second/third', 'first/second/third/fourth', 'first/second/fourth', 'first/fourth'];

		options.addOptions(testCases, '');
		const data = options.startFolders;
		for (let i = 0; i < data.length; i++) {
			expect(data[i].label).toEqual(answers[i]);
		}

	});

	it('Long Path', () => {
		const testCases = [{ id: 1, title: '1', children: [{ id: 2, title: '2', children: [{ id: 3, title: '3', children: [{ id: 4, title: '4', children: [{ id: 5, title: '5', children: [{ id: 6, title: '6', children: [{ id: 7, title: '7', children: [{ id: 8, title: '8', children: [{ id: 9, title: '9', children: [{ id: 10, title: '10', children: [{ id: 11, title: '11', children: [{ id: 12, title: '12', children: [{ id: 13, title: '13', children: [{ id: 14, title: '14', children: [{ id: 15, title: '15' }] }] }] }] }] }] }] }] }] }] }] }] }] }, { id: 16, title: '16' }] }];

		options.addOptions(testCases, '');
		const data = options.startFolders;
		let answer = '';
		for (let i = 1; i <= data.length - 1; i++) {
			answer += i;
			expect(data[i - 1].label).toEqual(answer);
			answer += '/';
		}
		expect(data[data.length - 1].label).toEqual('1/16');

	});

});
