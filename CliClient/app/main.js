#!/usr/bin/env node

// Loading time: 20170803: 1.5s with no commands

require('source-map-support').install();
require('babel-plugin-transform-runtime');

import { app } from './app.js';
import { BaseModel } from 'lib/base-model.js';
import { Folder } from 'lib/models/folder.js';
import { Resource } from 'lib/models/resource.js';
import { BaseItem } from 'lib/models/base-item.js';
import { Note } from 'lib/models/note.js';
import { Tag } from 'lib/models/tag.js';
import { NoteTag } from 'lib/models/note-tag.js';
import { Setting } from 'lib/models/setting.js';
import { Logger } from 'lib/logger.js';
import { FsDriverNode } from './fs-driver-node.js';
import { shimInit } from 'lib/shim-init-node.js';
import { _ } from 'lib/locale.js';

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

let commandCancelCalled_ = false;

process.on("SIGINT", async function() {
	const cmd = application.currentCommand();

	if (!cmd || !cmd.cancellable() || commandCancelCalled_) {
		process.exit(0);
	} else {
		commandCancelCalled_ = true;
		await cmd.cancel();
	}
});

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