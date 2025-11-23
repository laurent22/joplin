"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const InteropService_Importer_Md_1 = require("./InteropService_Importer_Md");
const Note_1 = require("../../models/Note");
const Tag_1 = require("../../models/Tag");
const shim_1 = require("../../shim");
const frontMatter_1 = require("../../utils/frontMatter");
class InteropService_Importer_Md_frontmatter extends InteropService_Importer_Md_1.default {
    async importFile(filePath, parentFolderId) {
        try {
            const note = await super.importFile(filePath, parentFolderId);
            const { metadata, tags } = (0, frontMatter_1.parse)(note.body);
            const updatedNote = Object.assign(Object.assign(Object.assign({}, note), metadata), { title: metadata.title ? metadata.title : note.title });
            const noteItem = await Note_1.default.save(updatedNote, { isNew: false, autoTimestamp: false });
            const resolvedPath = shim_1.default.fsDriver().resolve(filePath);
            this.importedNotes[resolvedPath] = noteItem;
            for (const tag of tags) {
                await Tag_1.default.addNoteTagByTitle(noteItem.id, tag);
            }
            return noteItem;
        }
        catch (error) {
            error.message = `On ${filePath}: ${error.message}`;
            throw error;
        }
    }
}
exports.default = InteropService_Importer_Md_frontmatter;
