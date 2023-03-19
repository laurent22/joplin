import commandToString from './commandToString';

describe('commandToString', () => {

	it('should convert a command array to a string', () => {
		const testCases: [string, string[], string][] = [
			['ls', ['-la'], 'ls -la'],
			['docker', ['--profile', 'with spaces'], 'docker --profile "with spaces"'],
			['', [], ''],
			['', [''], ''],
		];

		for (const [commandName, args, expected] of testCases) {
			const actual = commandToString(commandName, args);
			expect(actual).toBe(expected);
		}
	});

});
