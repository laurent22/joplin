import InteropService_Exporter_Base from './InteropService_Exporter_Base';
import BaseModel, { ModelType } from '../../BaseModel';
import BaseItem from '../../models/BaseItem';
import shim from '../../shim';
import markupLanguageUtils from '../../markupLanguageUtils';
import Folder from '../../models/Folder';
import Note from '../../models/Note';
import Setting from '../../models/Setting';
import { MarkupToHtml } from '@joplin/renderer';
import { ExportOptions } from './types';
import { NoteEntity, ResourceEntity, ResourceLocalStateEntity } from '../database/types';
import { contentScriptsToRendererRules } from '../plugins/utils/loadContentScripts';
import { ThemeStyle } from '../../theme';
import { basename, friendlySafeFilename, rtrimSlashes, dirname } from '../../path-utils';
import packToWriter from '@joplin/htmlpack/packToWriter';
const { themeStyle } = require('../../theme');
import { escapeHtml } from '../../string-utils';
import { assetsToHeaders } from '@joplin/renderer';
import getPluginSettingValue from '../plugins/utils/getPluginSettingValue';
import { LinkRenderingType } from '@joplin/renderer/MdToHtml';
import Logger from '@joplin/utils/Logger';
import { parseRenderedNoteMetadata } from './utils';
import ResourceLocalState from '../../models/ResourceLocalState';
import { getGlobalSettings, RenderOptions, RenderResultPluginAsset, ResourceInfos } from '@joplin/renderer/types';
import { fromFilename } from '../../mime-utils';
import { _ } from '../../locale';
import { hasWhiteboardFence, parseWhiteboard } from '../whiteboard/parse';
import { FileCanvasNode } from '../whiteboard/jsoncanvas';
import { isInternalRef, resolveFileRef } from '../whiteboard/resolveRef';
import renderWhiteboardToHtml, { FileCardContent } from '../whiteboard/renderToHtml';
import isNoteLockEnabled from '../noteLock/isNoteLockEnabled';
import NoteLockSession from '../noteLock/NoteLockSession';
const { isImageMimeType } = require('../../resourceUtils');

const logger = Logger.create('InteropService_Exporter_Html');

const uniqueAssets = (assets: RenderResultPluginAsset[]) => {
	const seen = new Set<string>();
	return assets.filter(asset => {
		const key = `${asset.name}:${asset.path}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
};

export default class InteropService_Exporter_Html extends InteropService_Exporter_Base {

	private customCss_: string;
	private destDir_: string;
	private filePath_: string;
	private createdDirs_: string[] = [];
	private resourceDir_: string;
	private markupToHtml_: MarkupToHtml;
	private resources_: ResourceInfos = {};
	private style_: ThemeStyle;
	private packIntoSingleFile_ = false;
	private shouldEmbedOnlyImages_ = false;

	public async init(path: string, options: ExportOptions = {}) {
		this.customCss_ = options.customCss ? options.customCss : '';

		if (this.metadata().target === 'file') {
			this.destDir_ = dirname(path);
			this.filePath_ = path;
			this.packIntoSingleFile_ = 'packIntoSingleFile' in options ? options.packIntoSingleFile : true;
			this.shouldEmbedOnlyImages_ = !!options.shouldEmbedOnlyImages;
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
					const [exportedFolderName] = output.split(/[/\\]/, 1);
					this.addTitleTruncationWarning_(item, exportedFolderName);
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

	// Whiteboard notes are rendered as a picture of the board instead of their JSONCanvas source. The board is
	// rendered separately and swapped in for a placeholder, so that the text around the fence is rendered as usual.
	private async renderWhiteboard_(originalBody: string, bodyMd: string, renderOptions: RenderOptions) {
		if (!hasWhiteboardFence(originalBody)) return null;
		const original = parseWhiteboard(originalBody);
		// Same canvas, but with the links to exported resources replaced by their path in the export
		const processed = parseWhiteboard(bodyMd);
		if (!original.hasCanvas || !processed.hasCanvas) return null;

		const pluginAssets: RenderResultPluginAsset[] = [];
		const renderMarkdown = async (markdown: string) => {
			const result = await this.markupToHtml_.render(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, markdown, this.style_, { ...renderOptions, bodyOnly: true });
			pluginAssets.push(...result.pluginAssets);
			return result.html;
		};

		const exportedPaths = new Map<string, string>();
		for (const [index, node] of original.canvas.nodes.entries()) {
			const processedNode = processed.canvas.nodes[index];
			if (node.type === 'file' && processedNode?.type === 'file' && processedNode.file !== node.file) {
				exportedPaths.set(node.id, processedNode.file);
			}
		}

		const renderFileCard = async (node: FileCanvasNode): Promise<FileCardContent> => {
			const exportedPath = exportedPaths.get(node.id);
			if (!isInternalRef(node.file)) {
				return isImageMimeType(fromFilename(node.file)) ? { imageSrc: node.file, header: node.file } : { header: _('File'), bodyHtml: escapeHtml(node.file) };
			}

			const id = resolveFileRef(node.file).id;
			const item = await BaseItem.loadItemById(id);
			if (!item || item.deleted_time) return { header: _('Linked item'), bodyHtml: escapeHtml(_('This linked item has been deleted.')), isNotice: true };

			if (item.type_ === ModelType.Resource) {
				const resource = item as ResourceEntity;
				if (exportedPath && isImageMimeType(resource.mime)) return { imageSrc: exportedPath, header: resource.title };
				return { header: _('File'), bodyHtml: escapeHtml(resource.title || node.file) };
			}

			if (item.type_ !== ModelType.Note) return { header: _('Linked item'), bodyHtml: escapeHtml(node.file) };

			let note = item as NoteEntity;
			if (isNoteLockEnabled()) {
				const lockedMessage = note.is_locked && !NoteLockSession.instance().isUnlocked()
					? _('This linked item cannot be displayed because the note is locked. Unlock the session to view it')
					: null;
				if (lockedMessage) return { header: note.title, bodyHtml: escapeHtml(lockedMessage), isNotice: true };
				try {
					note = await Note.load(id, { useNoteLock: true });
				} catch (error) {
					logger.warn(`Could not decrypt linked note ${id}:`, error);
					return { header: note.title, bodyHtml: escapeHtml(_('This linked item cannot be displayed because the note is locked and could not be unlocked')), isNotice: true };
				}
			}
			return { header: note.title || _('Untitled'), bodyHtml: note.body ? await renderMarkdown(note.body) : '' };
		};

		const theme = this.style_;
		const html = await renderWhiteboardToHtml(original.canvas, {
			theme: {
				appearance: theme.appearance,
				color: theme.color,
				colorFaded: theme.colorFaded,
				backgroundColor: theme.backgroundColor,
				dividerColor: theme.dividerColor,
			},
			renderMarkdown,
			renderFileCard,
		});

		const placeholder = `JoplinWhiteboard${Date.now()}${Math.floor(Math.random() * 1e9)}`;
		return {
			markdown: `${processed.prefix}\n\n${placeholder}\n\n${processed.suffix}`,
			placeholder,
			html,
			pluginAssets,
		};
	}

	public async processItem(_itemType: number, item: NoteEntity) {
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
				this.addTitleTruncationWarning_(item, basename(noteFilePath));
			}

			const bodyMd = await this.processNoteResources_(item);
			const renderOptions: RenderOptions = {
				resources: this.resources_,
				settingValue: getPluginSettingValue,

				plainResourceRendering: true,
				plugins: {
					link_open: {
						linkRenderingType: LinkRenderingType.HrefHandler,
					},
				},
				globalSettings: getGlobalSettings(Setting),
			};
			const whiteboard = item.markup_language === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN ? await this.renderWhiteboard_(item.body, bodyMd, renderOptions) : null;
			const result = await this.markupToHtml_.render(item.markup_language, whiteboard ? whiteboard.markdown : bodyMd, this.style_, renderOptions);
			if (whiteboard) {
				result.html = result.html.replace(new RegExp(`<p[^>]*>${whiteboard.placeholder}</p>|${whiteboard.placeholder}`), () => whiteboard.html);
				result.pluginAssets = uniqueAssets(result.pluginAssets.concat(whiteboard.pluginAssets));
			}

			const noteContent = [];
			const metadata = parseRenderedNoteMetadata(result.html ? result.html : '');
			if (!metadata.printTitle) logger.info('Not printing title because joplin-metadata-print-title tag is set to false');
			if (metadata.printTitle && item.title) noteContent.push(`<div class="exported-note-title">${escapeHtml(item.title)}</div>`);
			if (result.html) noteContent.push(result.html);

			// We need to export all the plugin assets too and refer them from the header
			// The source path is a bit hard-coded but shouldn't change.
			for (let i = 0; i < result.pluginAssets.length; i++) {
				const asset = result.pluginAssets[i];
				const filePath = asset.pathIsAbsolute ? asset.path : `${Setting.value('pluginAssetDir')}/${asset.name}`;
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

	public async processResource(resource: ResourceEntity, filePath: string) {
		if (!this.resourceDir_) return;
		if (!await shim.fsDriver().exists(this.resourceDir_)) {
			await shim.fsDriver().mkdir(this.resourceDir_);
		}

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
			const mainHtml = await shim.fsDriver().readFile(this.filePath_, 'utf8');
			const resolveToAllowedDir = (path: string) => {
				// TODO: Enable this for all platforms -- at present, this is mobile-only.
				const restrictToDestDir = !!shim.mobilePlatform();
				if (restrictToDestDir) {
					return shim.fsDriver().resolveRelativePathWithinDir(this.destDir_, path);
				} else {
					return shim.fsDriver().resolve(this.destDir_, path);
				}
			};
			// Chunk size must be divisible by 3 so base64 encoding does not add padding in the middle of the stream.
			const chunkBytes = 3 * 1024 * 1024;
			const tempFilePath = await shim.fsDriver().findUniqueFilename(`${this.filePath_}.tmp`);
			await shim.fsDriver().writeFile(tempFilePath, '', 'utf8');

			try {
				await packToWriter(
					this.destDir_,
					mainHtml,
					{
						exists: async (path) => {
							path = resolveToAllowedDir(path);
							const isFound = await shim.fsDriver().exists(path);
							if (!isFound) return false;
							const isDir = await shim.fsDriver().isDirectory(path);
							return !isDir;
						},
						readFileDataUri: async (path) => {
							path = resolveToAllowedDir(path);
							const mimeType = fromFilename(path);
							const content = await shim.fsDriver().readFile(path, 'base64');
							return `data:${mimeType};base64,${content}`;
						},
						readFileText: (path) => {
							path = resolveToAllowedDir(path);
							return shim.fsDriver().readFile(path, 'utf8');
						},
						streamFileDataUri: async (path, onChunk) => {
							path = resolveToAllowedDir(path);
							if (this.shouldEmbedOnlyImages_ && !isImageMimeType(fromFilename(path))) return;
							const handle = await shim.fsDriver().open(path, 'r');
							try {
								const mimeType = fromFilename(path);
								await onChunk(`data:${mimeType};base64,`);
								while (true) {
									const chunk = await shim.fsDriver().readFileChunk(handle, chunkBytes, 'base64');
									if (!chunk) break;
									await onChunk(chunk);
								}
							} finally {
								await shim.fsDriver().close(handle);
							}
						},
						async writeChunk(chunk) {
							await shim.fsDriver().appendFile(tempFilePath, chunk, 'utf8');
						},
					},
				);

				await shim.fsDriver().move(tempFilePath, this.filePath_);
			} catch (error) {
				if (await shim.fsDriver().exists(tempFilePath)) {
					await shim.fsDriver().remove(tempFilePath);
				}
				throw error;
			}

			for (const d of this.createdDirs_) {
				await shim.fsDriver().remove(d);
			}

			await shim.fsDriver().remove(this.resourceDir_);
			await shim.fsDriver().remove(`${this.destDir_}/pluginAssets`);
		}
	}

}
