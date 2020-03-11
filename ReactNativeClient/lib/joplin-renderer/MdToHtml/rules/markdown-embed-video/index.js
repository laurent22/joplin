'use strict';

const PluginEnvironment = require('./PluginEnvironment');
const renderer = require('./renderer');
const tokenizer = require('./tokenizer');


function setup(md, options) {
	let env = new PluginEnvironment(md, options);

	md.block.ruler.before('fence', 'video', tokenizer.bind(env), {
		alt: ['paragraph', 'reference', 'blockquote', 'list'],
	});
	md.renderer.rules['video'] = renderer.bind(env);
}


module.exports = setup;
