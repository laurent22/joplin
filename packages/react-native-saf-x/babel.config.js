module.exports = {
	presets: ['module:metro-react-native-babel-preset'],
	plugins: [
		[
			'@babel/plugin-transform-react-jsx',
			{
				runtime: 'automatic',
			},
		],
		[
			'module-resolver',
			{
				root: ['./'],
				extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
				alias: {
					'@': './src',
				},
			},
		],
	],
};
