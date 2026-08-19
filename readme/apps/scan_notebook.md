# Scanning multi-page documents

The mobile app supports a "scan notebook" workflow that allows quickly creating a note from pictures of multiple pages. To use it,

1. Open the new note menu and click "scan notebook".
2. Take a photo of each page to be scanned.
3. Click "next".
   - This opens a screen with a several options for creating the new note. The total number of photos should be listed near the last-taken photo preview.
4. Select a target notebook.
5. Click "create note".

The photos taken in step 2 are added to a new note.

## Search optimization

Requirements:
- A Joplin Cloud account or Joplin Server with the transcription service enabled.
- A version of the desktop app connected to the same account via sync.
- The "Handwriting transcription" setting enabled on desktop.
- Joplin >= 3.5.

When connected to Joplin Cloud/Server, the "Queue for transcription" option will be visible on the "Note preview" screen. Setting this to "enabled" will cause a connected copy of the desktop app to send the images to a server for higher-quality handwriting transcription. The transcribed handwriting is used to optimize searching for the note that contains the images.
