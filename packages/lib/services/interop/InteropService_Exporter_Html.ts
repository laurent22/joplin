import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import BaseModel from '../../BaseModel';
import shim from '../../shim';
import markupLanguageUtils from '../../markupLanguageUtils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import { MarkupToHtml } from '@joplin/renderer';
import { NoteEntity, ResourceEntity, ResourceLocalStateEntity } from '../database/types';
import { contentScriptsToRendererRules } from '../plugins/utils/loadContentScripts';
import { basename, friendlySafeFilename, rtrimSlashes, dirname } from '../../path-utils';
import htmlpack from '@joplin/htmlpack';
const { themeStyle } = require('../../theme');
const { escapeHtml } = require('../../string-utils.js');
import { assetsToHeaders } from '@joplin/renderer';
import getPluginSettingValue from '../plugins/utils/getPluginSettingValue';
import { LinkRenderingType } from '@joplin/renderer/MdToHtml';
import Logger from '@joplin/utils/Logger';
import { parseRenderedNoteMetadata } from './utils';
import ResourceLocalState from '../../models/ResourceLocalState';
import { ResourceInfos } from '@joplin/renderer/types';

const logger = Logger.create('InteropService_Exporter_Html');

export default class InteropService_Exporter_Html extends InteropService_Exporter_Base {

	private customCss_: string;
	private destDir_: string;
	private filePath_: string;
	private createdDirs_: string[] = [];
	private resourceDir_: string;
	private markupToHtml_: MarkupToHtml;
	private resources_: ResourceInfos = {};
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private style_: any;
	private packIntoSingleFile_ = false;

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async init(path: string, options: any = {}) {
		this.customCss_ = options.customCss ? options.customCss : '';

		if (this.metadata().target === 'file') {
			this.destDir_ = dirname(path);
			this.filePath_ = path;
			this.packIntoSingleFile_ = 'packIntoSingleFile' in options ? options.packIntoSingleFile : true;
		} else {
			this.destDir_ = path;
			this.filePath_ = null;
		}

		this.resourceDir_ = this.destDir_ ? `${this.destDir_}/_resources` : null;

		await shim.fsDriver().mkdir(this.destDir_);
		this.markupToHtml_ = markupLanguageUtils.newMarkupToHtml(null, {
			extraRendererRules: contentScriptsToRendererRules(options.plugins),
			customCss: this.customCss_ || '',
		});
		this.style_ = themeStyle(Setting.THEME_LIGHT);
	}

	private async makeDirPath_(item: NoteEntity, pathPart: string = null) {
		let output = '';
		while (true) {
			if (item.type_ === BaseModel.TYPE_FOLDER) {
				if (pathPart) {
					output = `${pathPart}/${output}`;
				} else {
					output = `${friendlySafeFilename(item.title)}/${output}`;
					output = await shim.fsDriver().findUniqueFilename(output);
				}
			}
			if (!item.parent_id) return output;
			item = await Folder.load(item.parent_id);
		}
	}

	private async processNoteResources_(item: NoteEntity) {
		const target = this.metadata().target;
		const linkedResourceIds = await Note.linkedResourceIds(item.body);
		const relativePath = target === 'directory' ? rtrimSlashes(await this.makeDirPath_(item, '..')) : '';
		const resourcePaths = this.context() && this.context().resourcePaths ? this.context().resourcePaths : {};

		let newBody = item.body;

		for (let i = 0; i < linkedResourceIds.length; i++) {
			const id = linkedResourceIds[i];
			// Skip the resources which haven't been downloaded yet
			if (!resourcePaths[id]) {
				continue;
			}
			const resourceContent = `${relativePath ? `${relativePath}/` : ''}_resources/${basename(resourcePaths[id])}`;
			newBody = newBody.replace(new RegExp(`:/${id}`, 'g'), resourceContent);
		}

		return newBody;
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async processItem(_itemType: number, item: any) {
		if ([BaseModel.TYPE_NOTE, BaseModel.TYPE_FOLDER].indexOf(item.type_) < 0) return;

		let dirPath = '';
		if (!this.filePath_) {
			dirPath = `${this.destDir_}/${await this.makeDirPath_(item)}`;

			if (this.createdDirs_.indexOf(dirPath) < 0) {
				await shim.fsDriver().mkdir(dirPath);
				this.createdDirs_.push(dirPath);
			}
		}

		if (item.type_ === BaseModel.TYPE_NOTE) {
			let noteFilePath = '';

			if (this.filePath_) {
				noteFilePath = this.filePath_;
			} else {
				noteFilePath = `${dirPath}/${friendlySafeFilename(item.title)}.html`;
				noteFilePath = await shim.fsDriver().findUniqueFilename(noteFilePath);
			}

			const bodyMd = await this.processNoteResources_(item);
			const result = await this.markupToHtml_.render(item.markup_language, bodyMd, this.style_, {
				resources: this.resources_,
				settingValue: getPluginSettingValue,

				plainResourceRendering: true,
				plugins: {
					link_open: {
						linkRenderingType: LinkRenderingType.HrefHandler,
					},
				},
			});

			const noteContent = [];
			const metadata = parseRenderedNoteMetadata(result.html ? result.html : '');
			if (!metadata.printTitle) logger.info('Not printing title because joplin-metadata-print-title tag is set to false');
			if (metadata.printTitle && item.title) noteContent.push(`<div class="exported-note-title">${escapeHtml(item.title)}</div>`);
			if (result.html) noteContent.push(result.html);

			const libRootPath = dirname(dirname(__dirname));

			// We need to export all the plugin assets too and refer them from the header
			// The source path is a bit hard-coded but shouldn't change.
			for (let i = 0; i < result.pluginAssets.length; i++) {
				const asset = result.pluginAssets[i];
				const filePath = asset.pathIsAbsolute ? asset.path : `${libRootPath}/node_modules/@joplin/renderer/assets/${asset.name}`;
				if (!(await shim.fsDriver().exists(filePath))) {
					logger.warn(`File does not exist and cannot be exported: ${filePath}`);
				} else {
					const destPath = `${dirname(noteFilePath)}/pluginAssets/${asset.name}`;
					const dir = dirname(destPath);
					await shim.fsDriver().mkdir(dir);
					this.createdDirs_.push(dir);
					await shim.fsDriver().copy(filePath, destPath);
				}
			}

			const fullHtml = `
				<!DOCTYPE html>
				<html>
					<head>
						<meta charset="UTF-8">
						<meta name="viewport" content="width=device-width, initial-scale=1" />
						${assetsToHeaders(result.pluginAssets, { asHtml: true })}
						<title>${escapeHtml(item.title)}</title>
					</head>
					<body>
						<div class="exported-note">${noteContent.join('\n\n')}</div>
					</body>
				</html>
			`;

			await shim.fsDriver().writeFile(noteFilePath, fullHtml, 'utf-8');
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async processResource(resource: ResourceEntity, filePath: string) {
		const destResourcePath = `${this.resourceDir_}/${basename(filePath)}`;
		await shim.fsDriver().copy(filePath, destResourcePath);
		const localState: ResourceLocalStateEntity = await ResourceLocalState.load(resource.id);
		this.resources_[resource.id] = {
			localState,
			item: resource,
		};
	}

	public async close() {
		if (this.packIntoSingleFile_) {
			const tempFilePath = `${this.filePath_}.tmp`;
			await shim.fsDriver().move(this.filePath_, tempFilePath);
			await htmlpack(tempFilePath, this.filePath_);
			await shim.fsDriver().remove(tempFilePath);

			for (const d of this.createdDirs_) {
				await shim.fsDriver().remove(d);
			}

			await shim.fsDriver().remove(this.resourceDir_);
			await shim.fsDriver().remove(`${this.destDir_}/pluginAssets`);
		}
	}

}
