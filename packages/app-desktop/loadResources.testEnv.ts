/**
 * A Jest custom test Environment to load the resources for the tests.
 * Use this test envirenment when you work with resources like images, files.
 * See gui/NoteEditor/utils/contextMenu.test.ts for an example.
 */

const JSDOMEnvironment = require('jest-environment-jsdom');
import type { EnvironmentContext } from '@jest/environment';
import type { Config } from '@jest/types';


export default class CustomEnvironment extends JSDOMEnvironment {
	constructor(config: Config.ProjectConfig, context?: EnvironmentContext) {
		// Resources is set to 'usable' to enable fetching of resources like images and fonts while testing
		// Which does not happen by default in jest
		// https://stackoverflow.com/a/49482563
		config.testEnvironmentOptions.resources = 'usable';
		super(config, context);
	}
}
