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

process.on('unhandledRejection', (reason, p) => {
	console.error('Unhandled promise rejection', p, 'reason:', reason);
});

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

app().start().catch((error) => {
	console.error(_('Fatal error:'));
	console.error(error);
});