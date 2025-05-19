module.exports = {
	'overrides': [
		{
			files: ['**/*.tsx', '**/*.js', '**/*.ts'],
			rules: {
				'no-restricted-globals': ['error',
					...['alert', 'confirm', 'prompt'].map(alertLikeFunction => ({
						'name': alertLikeFunction,
						'message': [
							'Avoid using alert()/confirm()/prompt() in the desktop app -- they break keyboard input on some systems.',
							'Prefer shim.showMessageBox and shim.showConfirmationDialog.',
							'See https://github.com/electron/electron/issues/19977.',
						].join(' '),
					})),
				],
			},
		},
	],
};
