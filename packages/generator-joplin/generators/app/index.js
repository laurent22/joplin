'use strict';

const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');

function mergePackageKey(parentKey, source, dest) {
	const output = Object.assign({}, dest);

	for (const k in source) {
		if (!(k in output)) {
			// If the key doesn't exist in the destination, add it
			output[k] = source[k];
		} else if (parentKey === 'devDependencies') {
			// If we are dealing with the dependencies, overwrite with the
			// version from source.
			output[k] = source[k];
		} else if (typeof source[k] === 'object' && !Array.isArray(k) && source[k] !== null) {
			// If it's an object, recursively process it
			output[k] = mergePackageKey(k, source[k], output[k]);
		} else {
			// Otherwise, the default is to preserve the destination key
			output[k] = dest[k];
		}
	}

	return output;
}

module.exports = class extends Generator {

	constructor(args, opts) {
		super(args, opts);

		this.option('silent');
		this.option('update');

		if (this.options.update) {
			// When updating, overwrite files without prompting
			this.conflicter.force = true;
		}
	}

	async prompting() {
		this.log(yosay(`Welcome to the fine ${chalk.red('generator-joplin')} generator!`));

		if (this.options.update && !this.options.silent) {
			const answers = await this.prompt([
				{
					type: 'confirm',
					name: 'proceed',
					message: [
						'Updating will overwrite all the generator files **except for the',
						'src/ directory**. So if you have made any changes outside of src/',
						'make sure your code is under version control so that you can inspect',
						'the diff and re-apply your changes if needed. Do you want to proceed?',
					].join('\n'),
				},
			]);

			if (!answers.proceed) {
				this.log('');
				this.log('Operation was cancelled and no changes was made');
				process.exit(0);
			}
		}

		const prompts = [
			{
				type: 'input',
				name: 'pluginId',
				message: 'Plugin ID [Must be a globally unique ID such as "com.example.MyPlugin" or a UUID]',
			},
			{
				type: 'input',
				name: 'pluginName',
				message: 'Plugin name [User-friendly string which will be displayed in UI]',
			},
			{
				type: 'input',
				name: 'pluginDescription',
				message: 'Plugin description:',
			},
			{
				type: 'input',
				name: 'pluginAuthor',
				message: 'Author:',
			},
			{
				type: 'input',
				name: 'pluginHomepageUrl',
				message: 'Homepage URL:',
			},
		];

		if (this.options.update) {
			const props = {};
			for (const prompt of prompts) {
				props[prompt.name] = '';
			}
			this.props = props;
		} else {
			return this.prompt(prompts).then(props => {
				this.props = props;
			});
		}
	}

	writing() {
		// Due to WONTFIX bug in npm, which treats .gitignore and pakage.json in a special way,
		// we need to give them a different name in the templates dir and then rename them
		// when installing.
		// https://github.com/npm/npm/issues/3763

		const files = [
			'.gitignore_TEMPLATE',
			'package_TEMPLATE.json',
			'README.md',
			'tsconfig.json',
			'webpack.config.js',
		];

		const noUpdateFiles = [
			'src/index.ts',
			'src/manifest.json',
		];

		const allFiles = files.concat(noUpdateFiles);

		for (const file of allFiles) {
			if (this.options.update && noUpdateFiles.includes(file)) continue;

			const destFile = file.replace(/_TEMPLATE/, '');
			const destFilePath = this.destinationPath(destFile);

			if (this.options.update && destFile === 'package.json' && this.fs.exists(destFilePath)) {
				const destContent = this.fs.readJSON(destFilePath);

				this.fs.copy(
					this.templatePath(file),
					destFilePath, {
						process: (sourceBuffer) => {
							const sourceContent = JSON.parse(sourceBuffer.toString());
							const newContent = mergePackageKey(null, sourceContent, destContent);
							return JSON.stringify(newContent, null, 2);
						},
					}
				);
			} else {
				this.fs.copyTpl(
					this.templatePath(file),
					destFilePath,
					this.props
				);
			}
		}

		this.fs.copy(
			this.templatePath('api'),
			this.destinationPath('api')
		);
	}

	install() {
		this.installDependencies({
			npm: true,
			bower: false,
			yarn: false,
		});
	}
};
