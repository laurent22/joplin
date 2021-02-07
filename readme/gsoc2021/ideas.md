# GSoC 2021 Ideas

2021 is Joplin second round at Google Summer of Code. Detailed information on how to get involved and apply are given in the [general Summer of Code introduction](https://joplinapp.org/gsoc2021/index/) 

**These are all proposals! We are open to new ideas you might have!!** Do you have an awesome idea you want to work on with Joplin but that is not among the ideas below? That's cool. We love that! But please do us a favour: Get in touch with a mentor early on and make sure your project is realistic and within the scope of Joplin. Just make sure your idea is within this year's theme:

- **Plugin development** - implementing new features using Joplin's plugin system.
- **External desktop applications** - build external Joplin applications by retrieving, creating or modifying notes via the Data API.
- **External server applications** - leverage the Joplin Server API to provide online features to Joplin users.

# Information for Students

These ideas were contributed by our developers and users. They are sometimes vague or incomplete. If you wish to submit a proposal based on these ideas, you are urged to contact the developers and find out more about the particular suggestion you're looking at.

Becoming accepted as a Google Summer of Code student is quite competitive. Accepted students typically have thoroughly researched the technologies of their proposed project and have been in frequent contact with potential mentors. **Simply copying and pasting an idea here will not work.** On the other hand, creating a completely new idea without first consulting potential mentors rarely works.

# List of ideas

## 1. OCR plugin

It is possible to add support for OCR content in Joplin via the [Tesseract library](http://tesseract.projectnaptha.com/). A first step would be to assess the feasibility of this project by integrating the lib in the desktop app and trying to OCR an image. OCR support should be implemented as a service of the desktop app. It would extract the text from the images, and append the content as plain text to the notes.

Expected Outcome: A plugin for the desktop app that extract text from images and attach it to the note.

Difficulty Level: High

Skills Required: JavaScript, Image processing

Potential Mentor(s): [CalebJohn](https://github.com/CalebJohn/), [laurent22](https://github.com/laurent22/)

## 2. Template plugin

Joplin already supports templates however we would like to re-package this feature as a plugin. Thus you would remove it from the main app and create a new plugin for it. It should be compatible with existing templates. Once the plugin is created, it could be a good idea to improve the feature further, perhaps based on user feedback on GitHub or in the forum.

Expected Outcome: A plugin for the desktop app that handle note templates.

Difficulty Level: Medium

Skills Required: JavaScript

Potential Mentor(s):

## 3. BibTex plugin

Many of our users use Joplin for research note and as such a plugin that can add support for [BibTex](http://www.bibtex.org) would be very useful. The plugin should use locally stored citations, then display popup with type-ahead to allow the user to enter the citation into the document. A content script should also be created so that these citations are rendered correctly in the note viewer.

Expected Outcome: A plugin to enter BibTex citations

Difficulty Level: Medium

Skills Required: JavaScript, understanding of BibTex format

Potential Mentor(s):

## 4. Real-time collaboration on a note

Create a web applications that allows two or more users to collaborate in real time on the same note. Use the Joplin Server API to save and load the note.

Expected Outcome: A web application that allows users to collaborate on a note

Difficulty Level: High

Skills Required: JavaScript, Text editor, Web development

Potential Mentor(s):