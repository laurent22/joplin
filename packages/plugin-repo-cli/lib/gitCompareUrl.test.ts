import gitCompareUrl from './gitCompareUrl';

describe('gitCompareUrl', () => {

	test('should create a compare URL', () => {
		const testCases = [
			[
				{
					repository_url: 'https://github.com/JackGruber/joplin-plugin-copytags',
					_publish_commit: 'master:9ec4a476a54440ac43422c34e179dcabfca1e5a0',
				},
				{
					repository_url: 'https://github.com/JackGruber/joplin-plugin-copytags',
					_publish_commit: 'master:b52b01f6d3b709a811ac214253636a7c207c87dd',
				},
				'https://github.com/JackGruber/joplin-plugin-copytags/compare/b52b01f6d3b709a811ac214253636a7c207c87dd..9ec4a476a54440ac43422c34e179dcabfca1e5a0',
			],
			[
				{
					repository_url: 'https://github.com/JackGruber/joplin-plugin-copytags.git',
					_publish_commit: 'master:9ec4a476a54440ac43422c34e179dcabfca1e5a0',
				},
				{
					repository_url: 'https://github.com/JackGruber/joplin-plugin-copytags.git',
					_publish_commit: 'master:b52b01f6d3b709a811ac214253636a7c207c87dd',
				},
				'https://github.com/JackGruber/joplin-plugin-copytags/compare/b52b01f6d3b709a811ac214253636a7c207c87dd..9ec4a476a54440ac43422c34e179dcabfca1e5a0',
			],
			[
				{
					repository_url: 'https://github.com/JackGruber/joplin-plugin-copytags',
					_publish_commit: 'master:9ec4a476a54440ac43422c34e179dcabfca1e5a0',
				},
				null,
				'https://github.com/JackGruber/joplin-plugin-copytags/tree/9ec4a476a54440ac43422c34e179dcabfca1e5a0',
			],
			[
				{
					_publish_commit: 'master:9ec4a476a54440ac43422c34e179dcabfca1e5a0',
				},
				null,
				null,
			],
		];

		for (const t of testCases) {
			const [manifest, previousManifest, expected] = t;
			const actual = gitCompareUrl(manifest, previousManifest);
			expect(actual).toBe(expected);
		}
	});

});
