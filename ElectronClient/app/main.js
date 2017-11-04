// Make it possible to require("/lib/...") without specifying full path
require('app-module-path').addPath(__dirname);

const electronApp = require('electron').app;
const { initApp } = require('./app');

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', p, 'reason:', reason);
	process.exit(1);
});

const app = initApp(electronApp);

app.start(process.argv).catch((error) => {
	console.error(_('Fatal error:'));
	console.error(error);
});