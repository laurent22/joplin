# GSoC 2023 Ideas

2023 is Joplin third round at Google Summer of Code. Detailed information on how to get involved and apply are given in the [general Summer of Code introduction](https://joplinapp.org/gsoc2023/)

**These are all proposals! We are open to new ideas you might have!!** Do you have an awesome idea you want to work on with Joplin but that is not among the ideas below? That's cool. We love that! But please do us a favour: Get in touch with a mentor early on and make sure your project is realistic and within the scope of Joplin. This year's themes are:

- **Plugins** - leverage the Joplin plugin API to add new functionalities
- **External apps** - leverage the Joplin public API to create external applications
- **Independent modules** - create self-contains modules within the core application
- And you are welcome to suggest your own ideas.

# Information for Contributors

These ideas were contributed by our developers and users. They are sometimes vague or incomplete. If you wish to submit a proposal based on these ideas, you are urged to contact the developers and find out more about the particular suggestion you're looking at.

Becoming accepted as a Google Summer of Code contributor is quite competitive. Accepted contributors typically have thoroughly researched the technologies of their proposed project and have been in frequent contact with potential mentors. **Simply copying and pasting an idea here will not work.** On the other hand, creating a completely new idea without first consulting potential mentors rarely works.

# List of ideas

## 1. Plugin system on mobile

The plugin system is currently available on desktop and CLI. We believe it could work on mobile too although some work will have to be done to make the plugin API compatible, as well as add a mechanism to load plugins.

Expected Outcome: Allow loading and running plugins on mobile

Difficulty Level: High

Skills Required: TypeScript, React Native

Potential Mentor(s):

Expected size of project: 350 hours

## 2. Seamless desktop application updates

The desktop application currently supports automatic updates, however the process is not particularly smooth: the user is presented with a modal dialog, where they need to click "Download" and that opens the default browser to download the file. Then they need to run this file and go through the installer.

We would like to make this process smoother:

- The installer should be automatically downloaded in the background

- It should then install the app automatically when the next time the app is started

- And this should work at least on Windows and macOS (Linux may be special due to the different distribution methods)

Expected Outcome: The app shall inform the user that an update is available. If an update shall be applied, the installer runs the update process fully automatically in the background during the next startup. It shall be explored if a live update is feasible and how conflicts can be resolved as used files are to be replaced.

Difficulty Level: Medium

Skills Required: TypeScript, React. Some knowledge of Electron and electron-builder.

Potential Mentor(s):

Expected size of project: 175 hours

## 3. Improve PDF export

Joplin uses Chrome's built-in print to PDF function which is very limited. This can be improved by using a 3rd party library to convert notes to PDF. Applies to desktop and CLI versions.

Potential benefits:

* Export multiple notes as a single PDF

* Embedding attachments (see https://github.com/laurent22/joplin/issues/5943)

* Delay export until the note is fully rendered (https://discourse.joplinapp.org/t/ability-to-delay-pdf-export-to-allow-plugins-to-render/22159)

Expected Outcome: PDF export no longer relies on Chrome print to pdf

Difficulty level: Medium

Skills Required: Typescript, Javascript.

Potential Mentor(s):

Expected size of project: 350 hours

## 4. Desktop application integration testing

The desktop app front end has a few unit tests to verify things like React hooks and certain utility functions. However we currently have no integration testing to verify for example that a change in one component didn't break something in another component. This project would be about setting up this integration testing for the desktop app. You would do the setup and probably also write a few tests to demonstrate that it's working as expected. More info at https://www.electronjs.org/docs/latest/tutorial/automated-testing

Expected Outcome: The student will have a good understanding on how to setup automated testing of the desktop app, and will have implemented automated testing for at least a subset of the application (e.g. Markdown editor and WYSIWYG editor)

Difficulty Level: High

Skills Required: TypeScript, JavaScript, Electron.

Potential Mentor(s):

Expected size of project: 350 hours

## 5. OCR plugin

It is possible to add support for OCR content in Joplin via the [Tesseract library](http://tesseract.projectnaptha.com/). A first step would be to assess the feasibility of this project by integrating the lib in the desktop app and trying to OCR an image. OCR support should be implemented as a service of the desktop app. It would extract the text from the images, and append the content as plain text to the notes.

Expected Outcome: A plugin for the desktop app that extract text from images and attach it to the note.

Difficulty Level: High

Skills Required: JavaScript, Image processing

Potential Mentor(s):

## 6. Voice to text on mobile

Add support for voice to text on mobile.

Expected Outcome: Open a note, select the "Voice to text" feature, and start recording. That should automatically convert the audio to text and add it to the note.

Difficulty Level: High

Skills Required: JavaScript, React Native

Potential Mentor(s): 

## 7. PDF annotations

We would like to add annotation support to the beta PDF viewer on desktop. The annotation tools should be similar to what's in Apple Preview for instance - ability to draw over a PDF, to add text boxes, to draw lines and arrow, etc. These annotations must be saved to the file.

Expected Outcome: Add annotations to a PDF file

Difficulty Level: High

Skills Required: JavaScript

Potential Mentor(s): 

## 8. Plugin inspector

Electron provides an API that allows inspecting any sub-process it creates. We can use that to monitor the performance of each plugin - how much CPU they use, how much memory, etc. We would also like to display an alert in the app if a plugin is using too much resources over a long period of time.

Expected Outcome: A module that interacts with the Electron API and gather information about the plugin processes. A window that displays the list of plugin along with CPU and memory information. An alert when a plugin uses too much resources.

Difficulty Level: High

Skills Required: JavaScript, Electron

Potential Mentor(s): 

## 9. Template insertion tool

Joplinc can store general templates as notes that can be used in various context. For example, it could have email templates that could be inserted into a Thunderbird email. Or code snippets that could be inserted into a text editor. The workflow will be as follow

- User presses a global shortcut, for example Ctrl+Alt+T, from any text editor (email client, code editor, etc.)
- A floating window is opened, from which the user can pick a note
- Once a note is selected, its content is inserted into the text editor

Expected Outcome: This can developed as an external application or possibly as part of the core application, but some changes will have to be made to allow this. It needs to work at least on Windows and macOS.

Difficulty Level: High

Skills Required: JavaScript, Windows/macOS programming

Potential Mentor(s): 

# More info

- Make sure you read the [Joplin Google Summer of Code Introduction](https://joplinapp.org/gsoc2023/)
- To build the application, please read [BUILD.md](https://github.com/laurent22/joplin/blob/dev/BUILD.md)
- And before creating a pull request, please read the [pull request guidelines](https://joplinapp.org/gsoc2023/pull_request_guidelines/)
