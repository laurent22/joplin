'use strict';

const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');
const { mergePackageKey, mergeIgnoreFile, packageNameFromPluginName } = require('./utils');

module.exports = class extends Generator {

	constructor(args, opts) {
		super(args, opts);

		this.option('silent');
		this.option('update');
		this.option('nodePackageManager', 'npm');

		if (this.options.update) {
			// When updating, overwrite files without prompting
			this.conflicter.force = true;
		}
	}

	async prompting() {
		this.log(yosay(`Welcome to the fine ${chalk.red('Joplin Plugin')} generator!`));

		if (this.options.update && !this.options.silent) {
			const answers = await this.prompt([
				{
					type: 'confirm',
					name: 'proceed',
					message: [
						'Updating will overwrite the config-related files. It will not change the',
						'  content of /src or README.md. If you have made any changes to some of the',
						'  config files make sure your code is under version control so that you can',
						'  inspect the diff and re-apply your changes if needed. Do you want to proceed?',
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
				message: 'Plugin ID\n  Must be a globally unique ID such as "com.example.MyPlugin" or a UUID:',
			},
			{
				type: 'input',
				name: 'pluginName',
				message: 'Plugin name\n  User-friendly string which will be displayed in UI:',
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
				name: 'pluginRepositoryUrl',
				message: 'Repository URL:',
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
			props.packageName = '';

			this.props = props;
		} else {
			const initialProps = await this.prompt(prompts);

			const defaultPackageName = packageNameFromPluginName(initialProps.pluginName);

			const derivedProps = await this.prompt([
				{
					type: 'input',
					name: 'packageName',
					message: `The npm package will be named: "${defaultPackageName}"\n  Press ENTER to keep this default, or type a name to change it:`,
				},
			]);

			if (!derivedProps.packageName) derivedProps.packageName = defaultPackageName;

			this.props = Object.assign({}, initialProps, derivedProps);
		}
	}

	writing() {
		// Due to WONTFIX bug in npm, which treats .gitignore and pakage.json in a special way,
		// we need to give them a different name in the templates dir and then rename them
		// when installing.
		// https://github.com/npm/npm/issues/3763

		const files = [
			'.gitignore_TEMPLATE',
			'.npmignore_TEMPLATE',
			'GENERATOR_DOC.md',
			'package_TEMPLATE.json',
			'tsconfig.json',
			'webpack.config.js',
			'plugin.config.json',
		];

		const noUpdateFiles = [
			'src/index.ts',
			'src/manifest.json',
			'README.md',
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
			} else if (this.options.update && destFile === 'plugin.config.json' && this.fs.exists(destFilePath)) {
				// Keep existing content for now. Maybe later we could merge the configs.
			} else if (this.options.update && (destFile === '.gitignore' || destFile === '.npmignore') && this.fs.exists(destFilePath)) {
				const destContent = this.fs.read(destFilePath);

				this.fs.copy(
					this.templatePath(file),
					destFilePath, {
						process: (sourceBuffer) => {
							return mergeIgnoreFile(sourceBuffer.toString(), destContent);
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

};
