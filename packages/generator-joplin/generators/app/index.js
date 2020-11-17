'use strict';

const Generator = require('yeoman-generator');
const chalk = require('chalk');
const yosay = require('yosay');

module.exports = class extends Generator {
	prompting() {
		this.log(yosay(`Welcome to the fine ${chalk.red('generator-joplin')} generator!`));

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

		return this.prompt(prompts).then(props => {
			this.props = props;
		});
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
			'src/index.ts',
			'src/manifest.json',
		];

		for (const file of files) {
			const destFile = file.replace(/_TEMPLATE/, '');
			this.fs.copyTpl(
				this.templatePath(file),
				this.destinationPath(destFile),
				this.props
			);
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
