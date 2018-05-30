const Folder = require('lib/models/Folder.js');

class NoteCountUtils {
    static async refreshNotesCount() {
        let initialFolders = await Folder.all({
            includeConflictFolder: true
        });
        let notesCount = [];
        for (let n = 0; n < initialFolders.length; n++) {
            let mFolder = initialFolders[n];
            notesCount[mFolder.id] = await Folder.noteCount(mFolder.id);
        }

        this.dispatch({
            type: 'FOLDER_COUNT_UPDATE_ALL',
            notesCount: notesCount
        });
    }
}

module.exports = {
    NoteCountUtils
};