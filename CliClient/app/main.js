#!/usr/bin/env node

// Loading time: 20170803: 1.5s with no commands

require('source-map-support').install();
require('babel-plugin-transform-runtime');

const { app } = require('./app.js');
const { BaseModel } = require('lib/base-model.js');
const { Folder } = require('lib/models/folder.js');
const { Resource } = require('lib/models/resource.js');
const { BaseItem } = require('lib/models/base-item.js');
const { Note } = require('lib/models/note.js');
const { Tag } = require('lib/models/tag.js');
const { NoteTag } = require('lib/models/note-tag.js');
const { Setting } = require('lib/models/setting.js');
const { Logger } = require('lib/logger.js');
const { FsDriverNode } = require('./fs-driver-node.js');
const { shimInit } = require('lib/shim-init-node.js');
const { _ } = require('lib/locale.js');

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

Setting.setConstant('appId', 'net.cozic.joplin-cli');
Setting.setConstant('appType', 'cli');

shimInit();

const application = app();

if (process.platform === "win32") {
	var rl = require("readline").createInterface({
		input: process.stdin,
		output: process.stdout
	});

	rl.on("SIGINT", function () {
		process.emit("SIGINT");
	});
}

// let commandCancelCalled_ = false;

// process.on("SIGINT", async function() {
// 	const cmd = application.currentCommand();

// 	if (!cmd || !cmd.cancellable() || commandCancelCalled_) {
// 		process.exit(0);
// 	} else {
// 		commandCancelCalled_ = true;
// 		await cmd.cancel();
// 	}
// });

process.stdout.on('error', function( err ) {
	// https://stackoverflow.com/questions/12329816/error-write-epipe-when-piping-node-output-to-head#15884508
	if (err.code == "EPIPE") {
		process.exit(0);
	}
});

application.start().catch((error) => {
	console.error(_('Fatal error:'));
	console.error(error);
});