# GSoC: OCR

It seems possible to add support for OCR content in Joplin via the [http://tesseract.projectnaptha.com/](Tesseract library).

A first step would be to assess the feasability of this project by integrating the lib in the desktop app and trying to OCR an image.

- Is the image correctly OCRed?
- Does it work with non-English text?
- How slow/fast is it? Test with a very large image to be sure. It should not freeze the app while processing an image.

If everything works well, we can add the feature to the app.

## Specification

- On desktop app: Create service that runs in the background and process the resources that need to be OCRed.
- When a document is OCRed: Append block to end of note that contains the extracted plain text
- When attaching resource, ask what user wants to do:
   - Always OCR all files
   - Never OCR any file
   - Always OCR files with extension ".ext"
   - Never OCR files with extension ".ext"
- Can be changed in settings
- Right-click resource, or note, to OCR content
- Add resource ocr_status on resource table: Can be: none, todo, processing, done
- Add ocr_text to resource: must include detailed coordinates, and a way to get plain text back

**Advantage of it doing that way:**

- Search engine just works - no need for special indexing of OCR content since it is inside the note directly
- Will work with all clients (mobile, desktop, terminal)
- When a note is exported to Markdown, it will include the OCR content

**Format of OCR text block**

```
<!-- autogen-ocr :resource.id -->
* * *

**:resource.title**

:resource.ocr_text
<!-- autogen-ocr :resourceId -->
```

For example, for a resource called "TrainTicket.png":

```
<!-- autogen-ocr 2ee4eec909734f7197654a9a040dfba7 -->
* * *

**TrainTicket.png**

From: London
To: Paris
Date: 01/12/2019
Time: 15:00
...etc.
<!-- autogen-ocr :resourceId -->
```

The advantage of this format is that it will render nicely in the viewer, and it will still be clearly identified as OCR content, which means later we can identify these blocks, update them, remove them, etc.

**Later**

- Support PDF files - for example by converting each page to an image first, then passing it to Tesseract.
- Make ocr_text searchable
- Display search results directly on document. i.e. if it's an image, highlight the parts of the image that contain the search text.

## See also

- GitHub issue: https://github.com/laurent22/joplin/issues/807
