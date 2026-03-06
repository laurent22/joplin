import InteropService_Exporter_Md from './InteropService_Exporter_Md';
import { ModelType } from '../../BaseModel';
import NoteTag from '../../models/NoteTag';
import Tag from '../../models/Tag';
import shim from '../../shim';
import { FolderIcon, FolderIconType, NoteEntity } from '../database/types';
import { serialize } from '../../utils/frontMatter';
import Logger from '@joplin/utils/Logger';
import * as yaml from 'js-yaml';

const logger = Logger.create('InteropService_Exporter_Md_frontmatter');

interface NoteTagContext {
	noteTags: Record<string, string[]>;
}

interface TagContext {
	tagTitles: Record<string, string>;
}

interface FrontMatterContext extends NoteTagContext, TagContext {}

export default class InteropService_Exporter_Md_frontmatter extends InteropService_Exporter_Md {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async prepareForProcessingItemType(itemType: number, itemsToExport: any[]) {
		await super.prepareForProcessingItemType(itemType, itemsToExport);

		if (itemType === ModelType.NoteTag) {
			// Get tag list for each note
			const context: NoteTagContext = {
				noteTags: {},
			};
			for (const exportItem of itemsToExport) {
				if (exportItem.type !== itemType) continue;

				const itemOrId = exportItem.itemOrId;
				const noteTag = typeof itemOrId === 'object' ? itemOrId : await NoteTag.load(itemOrId);

				if (!noteTag) continue;

				if (!context.noteTags[noteTag.note_id]) context.noteTags[noteTag.note_id] = [];
				context.noteTags[noteTag.note_id].push(noteTag.tag_id);
			}

			this.updateContext(context);
		} else if (itemType === ModelType.Tag) {
			// Map tag ID to title
			const context: TagContext = {
				tagTitles: {},
			};
			for (const exportItem of itemsToExport) {
				if (exportItem.type !== itemType) continue;

				const itemOrId = exportItem.itemOrId;
				const tag = typeof itemOrId === 'object' ? itemOrId : await Tag.load(itemOrId);

				if (!tag) continue;

				context.tagTitles[tag.id] = tag.title;
			}

			this.updateContext(context);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async processItem(itemType: number, item: any) {
		await super.processItem(itemType, item);

		// Write _notebook.yml with folder icon when processing a folder
		if (item.type_ === ModelType.Folder && item.icon) {
			try {
				const icon: FolderIcon = JSON.parse(item.icon);
				const dirPath = `${this.destDir_}/${await this.makeDirPath_(item)}`;
				const iconObj = await this.serializeFolderIcon(icon, dirPath);
				if (iconObj) {
					const metadataPath = `${dirPath}_notebook.yml`;
					const yamlContent = yaml.dump({ icon: iconObj }, { noCompatMode: true, schema: yaml.FAILSAFE_SCHEMA });
					await shim.fsDriver().writeFile(metadataPath, yamlContent, 'utf-8');
				}
			} catch (e) {
				logger.warn(`Failed to export folder icon for folder ${item.id}:`, e);
			}
		}
	}

	private async serializeFolderIcon(icon: FolderIcon, dirPath: string): Promise<Record<string, string> | null> {
		switch (icon.type) {
		case FolderIconType.Emoji:
			if (!icon.emoji) return null;
			return { type: 'emoji', emoji: icon.emoji };
		case FolderIconType.FontAwesome:
			if (!icon.name) return null;
			return { type: 'fontawesome', name: icon.name };
		case FolderIconType.DataUrl:
			if (!icon.dataUrl) return null;
			try {
				let extension = '.png';
				const mimeMatch = icon.dataUrl.match(/data:image\/([a-zA-Z0-9+\-.]+);base64,/);
				if (mimeMatch && mimeMatch[1]) {
					extension = `.${mimeMatch[1].split('+')[0]}`;
					if (extension === '.jpeg') extension = '.jpg';
				}

				const base64Data = icon.dataUrl.replace(/^data:image\/[^;]+;base64,/, '');
				const fileName = `_folder_icon${extension}`;

				// writeFile with 'base64' encoding decodes the base64 string to binary
				await shim.fsDriver().writeFile(`${dirPath}${fileName}`, base64Data, 'base64');

				return { type: 'dataurl', dataurl: fileName };
			} catch (e) {
				logger.warn('Failed to save DataUrl icon to file:', e);
				return null;
			}
		default:
			return null;
		}
	}

	protected async getNoteExportContent_(modNote: NoteEntity) {
		let tagTitles: string[] = [];
		const context: FrontMatterContext = this.context();
		if (context.noteTags[modNote.id]) {
			const tagIds = context.noteTags[modNote.id];
			// In some cases a NoteTag can still exist, while the Tag does not. In this case, tagTitles
			// for that tagId will return undefined, which can't be handled by the yaml library (issue #7782)
			tagTitles = tagIds.map((id: string) => context.tagTitles[id]).filter(e => !!e).sort();
		}

		return serialize(modNote, tagTitles);
	}

}
