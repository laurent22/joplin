# Importing and exporting

## Importing

### Importing from Evernote

Joplin can import complete Evernote notebooks, as well as notes, tags, resources (attached files) and note metadata (such as author, geo-location, etc.) via ENEX files. In terms of data, the only two things that might slightly differ are:

- Recognition data - Evernote images, in particular scanned (or photographed) documents have [recognition data](https://en.wikipedia.org/wiki/Optical_character_recognition) associated with them. It is the text that Evernote has been able to recognise in the document. This data is not preserved when the note are imported into Joplin. However, if you have enabled OCR in Joplin, that recognition data will be recreated in a format compatible with Joplin.

- Colour, font sizes and faces - Evernote text is stored as HTML and this is converted to Markdown during the import process. For notes that are mostly plain text or with basic formatting (bold, italic, bullet points, links, etc.) this is a lossless conversion, and the note, once rendered back to HTML should be very similar. Tables are also imported and converted to Markdown tables. For very complex notes, some formatting data might be lost - in particular colours, font sizes and font faces will not be imported. The text itself however is always imported in full regardless of formatting. If it is essential that this extra data is preserved then Joplin also allows import of ENEX files as HTML.

- Links between notes are mostly preserved. However the ENEX format does not include all the necessary information to find out what the target of a link is (specifically, Evernote use an ID for the link but that ID is not associated with the target note). Instead Joplin tries to guess what note is linked based on the note title, which mostly works, but not always - for example if multiple notes have the same title, or if the link title is different from the target note title. If Joplin cannot guess how to restore the link, the Evernote link will remain.

To import Evernote data, first export your Evernote notebooks to ENEX files as described [here](https://help.evernote.com/hc/en-us/articles/209005557-How-to-back-up-export-and-restore-import-notes-and-notebooks). Then follow these steps:

In the **desktop application**, open File > Import > ENEX and select your file. The notes will be imported into a new separate notebook. If needed they can then be moved to a different notebook, or the notebook can be renamed, etc.

In the **terminal application**, in [command-line mode](https://github.com/laurent22/joplin/blob/dev/readme/apps/terminal.md#command-line-mode), type `import /path/to/file.enex`. This will import the notes into a new notebook named after the filename.

In both cases you can either import a single file or a directory that contains multiple ENEX files.

- If you import a single file, a notebook with the same name will be created, and all notes will be imported in this notebook.

- If you import a directory, Joplin will create a notebook per file and import the notes into them.

For a video tutorial on how to export your notebooks from Evernote and import them on Joplin, please click on the thumbnail:

[![Watch the video](https://img.youtube.com/vi/_nSrvfUwORM/hqdefault.jpg)](https://www.youtube.com/watch?v=_nSrvfUwORM)  

### Importing from Markdown files

Joplin can import notes from plain Markdown file. You can either import a complete directory of Markdown files or individual files.

In the **desktop application**:

* **File import**: Go to File > Import > MD - Markdown (file) and select the Markdown file. This file will then be imported to the currently selected Notebook.
* **Directory import**: Go to File > Import > MD - Markdown (directory) and select the top level of the directory that is being imported. Directory (folder) structure will be preserved in the Notebook > Subnotebook > Note structure within Joplin.

In the **terminal application**, in [command-line mode](https://github.com/laurent22/joplin/blob/dev/readme/apps/terminal.md#command-line-mode):

Type `import --format md /path/to/file.md` or `import --format md /path/to/directory/`.

### Importing from OneNote

Joplin can also import OneNote notebooks:

#### Importing from OneNote Online

This requires Joplin >= v3.5.1 and a OneNote notebook stored on OneDrive. This approach [may not work for notebooks larger than 2-4 GB](https://learn.microsoft.com/en-us/answers/questions/5437286/why-cant-i-fully-download-my-onenote-files-from-on).

1. Visit [OneNote Web](https://www.onenote.com/notebooks). 
2. Click on "Show all notebooks". This should open a OneDrive page.
3. On OneDrive, go to "My Files" and download the folder containing the OneNote notebooks. This should download a ZIP file.
	- Right-click on the folder, then click "download". (Move the OneNote notebooks to a new folder, if necessary).
3. Follow the instructions to download the backup. It should be a ZIP file.
4. Open the **desktop application** and go to File > Import > ZIP - OneNote Notebook, and select the exported file.

#### Importing from the OneNote Windows desktop app

This requires Joplin >=v3.5.5 and the OneNote Windows desktop app. Be aware that the OneNote desktop app [is not the same as "OneNote for Windows 10"](https://support.microsoft.com/en-us/office/what-s-the-difference-between-the-onenote-versions-a624e692-b78b-4c09-b07f-46181958118f#id0ebd=windows).

1. Open the OneNote desktop application.
2. Open the "File" menu, then open the "Export" tab.
3. Select "Section", then "OneNote 2010-2016 Section (`*.one`/`*.onex`)".
	- Alternatively, select "Notebook", then "OneNote Package (`*.onepkg`)". `*.onepkg` files can only be imported if Joplin is running on Windows.
4. Open the Joplin desktop application.
5. From the "File" > "Import" menu, select "ZIP - OneNote Notebook". In the file picker, select the just-exported file.

For a video tutorial on how to export your notebooks from Onenote and import them on Joplin, please click on the thumbnail:

[![Watch the video](https://img.youtube.com/vi/xgYcLZsw0IA/hqdefault.jpg)](https://www.youtube.com/watch?v=xgYcLZsw0IA&t=2s)

### Importing from other applications

In general the way to import notes from other applications into Joplin is to convert the notes to ENEX files (Evernote format), HTML or Markdown, and to import these files into Joplin. For help about specific applications, see this wiki document: [Importing notes from other notebook applications](https://discourse.joplinapp.org/t/importing-notes-from-other-notebook-applications/22425).

## Exporting

Joplin can export to the JEX format (Joplin Export file), which is a tar file that can contain multiple notes, notebooks, etc. This is a lossless format in that all the notes, but also metadata such as geo-location, updated time, tags, etc. are preserved. This format is convenient for backup purposes and can be re-imported into Joplin. A "raw" format is also available. This is the same as the JEX format except that the data is saved to a directory and each item represented by a single file.

Joplin is also capable of exporting to a number of other formats including HTML and PDF which can be done for single notes, notebooks or everything.
