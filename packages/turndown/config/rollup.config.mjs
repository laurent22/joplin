import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import resolve from '@rollup/plugin-node-resolve';

export default function(config) {
	return {
		input: 'src/turndown.js',
		output: {
			name: 'TurndownService',
			...config.output,
		},
		external: ['jsdom'],
		plugins: [
			commonjs(),
			replace({
				'process.browser': JSON.stringify(!!config.browser),
				preventAssignment: true,
			}),
			resolve(),
		],
	};
}
