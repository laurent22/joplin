// This is the initialization for the Electron RENDERER process

// Make it possible to require("/lib/...") without specifying full path
require('app-module-path').addPath(__dirname);

const { app } = require('./app.js');
const { Folder } = require('lib/models/folder.js');
const { Resource } = require('lib/models/resource.js');
const { BaseItem } = require('lib/models/base-item.js');
const { Note } = require('lib/models/note.js');
const { Tag } = require('lib/models/tag.js');
const { NoteTag } = require('lib/models/note-tag.js');
const { Setting } = require('lib/models/setting.js');
const { Logger } = require('lib/logger.js');
const { FsDriverNode } = require('lib/fs-driver-node.js');
const { shimInit } = require('lib/shim-init-node.js');
const { bridge } = require('electron').remote.require('./bridge');

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;

// That's not good, but it's to avoid circular dependency issues
// in the BaseItem class.
BaseItem.loadClass('Note', Note);
BaseItem.loadClass('Folder', Folder);
BaseItem.loadClass('Resource', Resource);
BaseItem.loadClass('Tag', Tag);
BaseItem.loadClass('NoteTag', NoteTag);

Setting.setConstant('appId', 'net.cozic.joplin-desktop');
Setting.setConstant('appType', 'desktop');

// Disable drag and drop of links inside application (which would
// open it as if the whole app was a browser)
// document.addEventListener('dragover', event => event.preventDefault());
// document.addEventListener('drop', event => event.preventDefault());

// Disable middle-click (which would open a new browser window, but we don't want this)
document.addEventListener('auxclick', event => event.preventDefault());

shimInit();

app().start(bridge().processArgv()).then(() => {
	require('./gui/Root.min.js');
}).catch((error) => {
	console.error('Fatal error:');
	console.error(error);
});