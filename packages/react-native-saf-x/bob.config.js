module.exports = {
	source: 'src',
	output: 'lib',
	targets: [
		'commonjs',
		'module',
		[
			'typescript',
			{
				project: 'tsconfig.build.json',
			},
		],
	],
};
