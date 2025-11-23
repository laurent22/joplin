"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Exporter_Md_1 = require("./InteropService_Exporter_Md");
const BaseModel_1 = require("../../BaseModel");
const NoteTag_1 = require("../../models/NoteTag");
const Tag_1 = require("../../models/Tag");
const frontMatter_1 = require("../../utils/frontMatter");
class InteropService_Exporter_Md_frontmatter extends InteropService_Exporter_Md_1.default {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
    async prepareForProcessingItemType(itemType, itemsToExport) {
        await super.prepareForProcessingItemType(itemType, itemsToExport);
        if (itemType === BaseModel_1.default.TYPE_NOTE_TAG) {
            // Get tag list for each note
            const context = {
                noteTags: {},
            };
            for (let i = 0; i < itemsToExport.length; i++) {
                const it = itemsToExport[i].type;
                if (it !== itemType)
                    continue;
                const itemOrId = itemsToExport[i].itemOrId;
                const noteTag = typeof itemOrId === 'object' ? itemOrId : await NoteTag_1.default.load(itemOrId);
                if (!noteTag)
                    continue;
                if (!context.noteTags[noteTag.note_id])
                    context.noteTags[noteTag.note_id] = [];
                context.noteTags[noteTag.note_id].push(noteTag.tag_id);
            }
            this.updateContext(context);
        }
        else if (itemType === BaseModel_1.default.TYPE_TAG) {
            // Map tag ID to title
            const context = {
                tagTitles: {},
            };
            for (let i = 0; i < itemsToExport.length; i++) {
                const it = itemsToExport[i].type;
                if (it !== itemType)
                    continue;
                const itemOrId = itemsToExport[i].itemOrId;
                const tag = typeof itemOrId === 'object' ? itemOrId : await Tag_1.default.load(itemOrId);
                if (!tag)
                    continue;
                context.tagTitles[tag.id] = tag.title;
            }
            this.updateContext(context);
        }
    }
    async getNoteExportContent_(modNote) {
        let tagTitles = [];
        const context = this.context();
        if (context.noteTags[modNote.id]) {
            const tagIds = context.noteTags[modNote.id];
            // In some cases a NoteTag can still exist, while the Tag does not. In this case, tagTitles
            // for that tagId will return undefined, which can't be handled by the yaml library (issue #7782)
            tagTitles = tagIds.map((id) => context.tagTitles[id]).filter(e => !!e).sort();
        }
        return (0, frontMatter_1.serialize)(modNote, tagTitles);
    }
}
exports.default = InteropService_Exporter_Md_frontmatter;
