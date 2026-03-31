import InteropService_Exporter_Md from './InteropService_Exporter_Md';
import BaseModel, { ModelType } from '../../BaseModel';
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

		if (itemType === BaseModel.TYPE_NOTE_TAG) {
			// Get tag list for each note
			const context: NoteTagContext = {
				noteTags: {},
			};
			for (let i = 0; i < itemsToExport.length; i++) {
				const it = itemsToExport[i].type;

				if (it !== itemType) continue;

				const itemOrId = itemsToExport[i].itemOrId;
				const noteTag = typeof itemOrId === 'object' ? itemOrId : await NoteTag.load(itemOrId);

				if (!noteTag) continue;

				if (!context.noteTags[noteTag.note_id]) context.noteTags[noteTag.note_id] = [];
				context.noteTags[noteTag.note_id].push(noteTag.tag_id);
			}

			this.updateContext(context);
		} else if (itemType === BaseModel.TYPE_TAG) {
			// Map tag ID to title
			const context: TagContext = {
				tagTitles: {},
			};
			for (let i = 0; i < itemsToExport.length; i++) {
				const it = itemsToExport[i].type;

				if (it !== itemType) continue;

				const itemOrId = itemsToExport[i].itemOrId;
				const tag = typeof itemOrId === 'object' ? itemOrId : await Tag.load(itemOrId);

				if (!tag) continue;

				context.tagTitles[tag.id] = tag.title;
			}

			this.updateContext(context);
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Matches parent class signature
	public async processItem(itemType: number, item: any) {
		await super.processItem(itemType, item);

		// Write _folder.yml with folder icon when processing a folder
		if (item.type_ === ModelType.Folder && item.icon) {
			try {
				const icon: FolderIcon = JSON.parse(item.icon);
				const dirPath = `${this.destDir_}/${await this.makeDirPath_(item)}`;
				const iconObj = this.serializeFolderIcon(icon);
				if (iconObj) {
					const metadataPath = `${dirPath}_folder.yml`;
					const yamlContent = yaml.dump({ icon: iconObj }, { noCompatMode: true, schema: yaml.FAILSAFE_SCHEMA });
					await shim.fsDriver().writeFile(metadataPath, yamlContent, 'utf-8');
				}
			} catch (e) {
				logger.warn(`Failed to export folder icon for folder ${item.id}:`, e);
			}
		}
	}

	private serializeFolderIcon(icon: FolderIcon): Record<string, string> | null {
		switch (icon.type) {
		case FolderIconType.Emoji:
			if (!icon.emoji) return null;
			return { type: 'emoji', emoji: icon.emoji };
		case FolderIconType.FontAwesome:
			if (!icon.name) return null;
			return { type: 'fontawesome', name: icon.name };
		case FolderIconType.DataUrl:
			if (!icon.dataUrl) return null;
			return { type: 'dataurl', dataurl: icon.dataUrl };
		default: {
			const exhaustivenessCheck: never = icon.type;
			throw new Error(`Unknown folder icon type: ${exhaustivenessCheck}`);
		}
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
