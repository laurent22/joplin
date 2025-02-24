import { CommandRuntime, CommandDeclaration, CommandContext } from '@joplin/lib/services/CommandService';
import { _ } from '@joplin/lib/locale';
import { stateUtils } from '@joplin/lib/reducer';
// import ExternalEditWatcher from '@joplin/lib/services/ExternalEditWatcher';
import Note from '@joplin/lib/models/Note';
import { shell } from 'electron';
import Setting from '@joplin/lib/models/Setting';
import * as fs from 'fs';
import * as cheerio from 'cheerio';
import * as PATH from 'path';
import * as fsext from 'fs-extra';

const bridge = require('@electron/remote').require('./bridge').default;



const escapeRegExp = (str: string): string => {
	return str.replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&');
};

export const modifyJoplinResource = ($: cheerio.Root, resourceDir: string): cheerio.Root => {
	const regex = new RegExp(`^${escapeRegExp('joplin_resource:/')}`);
	const anchors = $('a[href^="joplin_resource://"]');

	for (let i = 0; i < anchors.length; i++) {
		const anchor = anchors[i] as cheerio.TagElement;
		const href = anchor.attribs.href;
		const newHref = href.replace(regex, resourceDir);
		anchor.attribs.href = newHref;
	}

	const imgs = $('img[src^="joplin_resource://"]');
	for (let i = 0; i < imgs.length; i++) {
		const img = imgs[i] as cheerio.TagElement;
		const src = img.attribs.src;
		const newSrc = src.replace(regex, resourceDir);
		img.attribs.src = newSrc;
	}
	return $;
};

export const revertResourceDirToJoplinScheme = (htmlBody: string, resourceDir: string): cheerio.Root => {
	const $ = cheerio.load(htmlBody);
	const anchors = [...$(`a[href^="file://${resourceDir}"]`), ...$(`a[href^="${resourceDir}"]`)];
	for (let i = 0; i < anchors.length; i++) {
		const anchor = anchors[i] as cheerio.TagElement;
		const href = anchor.attribs.href;
		const filename = PATH.basename(href);
		const newHref = `joplin_resource://${filename}`;
		anchor.attribs.href = newHref;
	}

	const imgs = [...$(`img[src^="file://${resourceDir}"]`), ...$(`img[src^="${resourceDir}"]`)];
	for (let i = 0; i < imgs.length; i++) {
		const img = imgs[i] as cheerio.TagElement;
		const src = img.attribs.src;
		const filename = PATH.basename(src);
		const newSrc = `joplin_resource://${filename}`;
		img.attribs.src = newSrc;
	}
	return $;
};


export const convertATagVideoToVideoTag = (anchorTag: string): string => {
	const $ = cheerio.load(anchorTag);
	const anchor = $('a');
	const href = anchor.attr('href');
	const text = anchor.text();
	// get extension
	const ext = PATH.extname(href);
	// create video extension list and whether it is video or not
	const videoExtList = ['.mp4', '.webm', '.ogg', '.ogv', '.m4v', '.mov', '.mkv'];
	const isVideo = videoExtList.includes(ext);
	if (!isVideo) {
		return anchorTag;
	}

	// escape href
	// create video tag text via cheerio

	const parent = cheerio.load('<div>');
	const video = $('<video>')
		.attr('controls', 'controls').attr('width', '100%')
		.attr('height', 'auto').attr('src', href).attr('title', text);
	parent('div').append(video);
	const videoText = parent.html();
	return videoText;
};


export const declaration: CommandDeclaration = {
	name: 'ShowBrowser',
	label: () => _('Show Browser'),
	iconName: 'icon-share',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);
			await showNoteByBrowser(noteId);
		},
		enabledCondition: 'oneNoteSelected',
	};
};

export const showNoteByBrowser = async (noteId: string) => {
	try {
		const note = await Note.load(noteId);
		await showNoteBodyByBrowser(note.body, note.title);
	} catch (error) {
		bridge().showErrorMessageBox(_('Error opening note in editor: %s', error.message));
	}
};

export const copyPluginAssetsIfNotExit = async () => {
	const curDir = process.cwd();
	// joplin/packages/app-desktop --> joplin/packages/lib/node_modules/@joplin/renderer/assets/katex
	console.log(`curDir: ${curDir}`);
	const srcDir = `${PATH.dirname(curDir)}/lib/node_modules/@joplin/renderer/assets/katex`;
	console.log(`srcDir: ${srcDir}`);
	const pluginDir = `${Setting.value('tempDir')}/pluginAssets`;
	console.log(`pluginDir: ${pluginDir}`);
	if (fs.existsSync(pluginDir)) {
		console.log(`pluginDir exists. ${pluginDir}`);
	} else {
		console.log(`pluginDir not exists. create ${pluginDir}`);
		fs.mkdirSync(pluginDir);
		await fsext.copy(srcDir, `${pluginDir}/katex`);
	}
};

export const modifyJoplinResourceAndSetPlugin = (noteBody: string, resourceDir: string): string =>{
	let $ = cheerio.load(noteBody);
	$ = modifyJoplinResource($, resourceDir);
	// headタグにlinkタグを追加する
	$('head').append('<link rel="stylesheet" href="pluginAssets/katex/katex.css">');
	return $.html();
};

export const showNoteBodyByBrowser = async (noteBody: string, noteTitle: string) => {
	try {
		const path = `${Setting.value('tempDir')}/${noteTitle}.html`;
		const resourceDir = `${Setting.value('resourceDir')}`;
		await copyPluginAssetsIfNotExit();

		const htmlBody = modifyJoplinResourceAndSetPlugin(noteBody, resourceDir);
		fs.writeFileSync(path, htmlBody);
		const url = `file://${path}`;
		await shell.openExternal(url);
	} catch (error) {
		bridge().showErrorMessageBox(_('Error opening note in editor: %s', error.message));
	}
};
