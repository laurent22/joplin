module.exports = {
	testMatch: [
		'**/tests/**/*.js',
		// '**/tests/services_keychainService.js',
		// '**/tests/urlUtils.js',
		// '**/tests/models_BaseItem.js',
		// '**/tests/markdownUtils.js',
		// '**/tests/models_Resource.js',
	],
	testPathIgnorePatterns: [
		'/node_modules/',
		'/tests\\/support/',
		'/build/',
		'test-utils.js',
		'file_api_driver.js',
	],
	testEnvironment: 'node',
	setupFilesAfterEnv: ['./jest.setup.js'],
};



// PASS  tests/services_rest_Api.js (14.705 s)
// PASS  tests/services_SearchFilter.js (21.203 s)
// PASS  tests/services_InteropService.js (10.807 s)
// PASS  tests/reducer.js (17.398 s)
// PASS  tests/services_Revision.js (17.642 s)
// PASS  tests/feature_NoteHistory.js (31.448 s)
// PASS  tests/services_KeymapService.js
// PASS  tests/services_EncryptionService.js (9.258 s)
// PASS  tests/models_Note.js (10.59 s)
// PASS  tests/services_ResourceService.js (13.177 s)
// PASS  tests/models_Folder.js (11.468 s)
// PASS  tests/MdToHtml.js (5.242 s)
// PASS  tests/services_PluginService.js (5.456 s)
// PASS  tests/models_Note_CustomSortOrder.js (5.52 s)
// PASS  tests/feature_ShowAllNotes.js (13.567 s)
// PASS  tests/models_Setting.js
// PASS  tests/models_Tag.js (6.324 s)
// PASS  tests/services_keychainService.js
// PASS  tests/urlUtils.js
// PASS  tests/models_BaseItem.js
// PASS  tests/markdownUtils.js
// (node:15679) UnhandledPromiseRejectionWarning: Error: {"title":"folder1"}: Fields have not been loaded yet
// (node:15679) UnhandledPromiseRejectionWarning: Unhandled promise rejection. This error originated either by throwing inside of an async function without a catch block, or by rejecting a promise which was not handled with .catch(). To termi$ate the node process on unhandled promise rejection, use the CLI flag `--unhandled-rejections=strict` (see https://nodejs.org/api/cli.html#cli_unhandled_rejections_mode). (rejection id: 31)
// (node:15679) [DEP0018] DeprecationWarning: Unhandled promise rejections are deprecated. In the future, promise rejections that are not handled will terminate the Node.js process with a non-zero exit code.
// FAIL  tests/models_Resource.js
