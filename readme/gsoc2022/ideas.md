# GSoC 2022 Ideas

2022 is Joplin third round at Google Summer of Code. Detailed information on how to get involved and apply are given in the [general Summer of Code introduction](https://joplinapp.org/gsoc2022/)

**These are all proposals! We are open to new ideas you might have!!** Do you have an awesome idea you want to work on with Joplin but that is not among the ideas below? That's cool. We love that! But please do us a favour: Get in touch with a mentor early on and make sure your project is realistic and within the scope of Joplin. This year's themes are:

- **Mobile and tablet development** - we want to improve the mobile/tablet application on iOS and Android.
- **Plugin and external apps** - leverage the Joplin API to create plugins and external apps.
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

Potential Mentor(s): [PackElend](https://discourse.joplinapp.org/u/PackElend), [Roman](https://discourse.joplinapp.org/u/roman_r_m), [Laurent](https://github.com/laurent22/)

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

Potential Mentor(s): [CalebJohn](https://github.com/CalebJohn/)

Expected size of project: 175 hours

## 3. Refactor the project documentation

The current documentation (under [joplinapp.org/help](https://joplinapp.org/help)) is mainly a giant README.md file and various smaller Markdown files under /readme. All this is then built into the HTML website by a script.

We would like to improve this by splitting the main readme into smaller sections, have a new menu that would reorganise the help into various topics, and of course the build script will need to be updated.

A good part of this project will be about researching how other projects organise their documentation, proposing a way that would work well for Joplin, and discussing your ideas with the mentors and users. You will need to be proactive and propose your own solution on how to structure the documentation - which sections and sub-sections should be created, how to split the existing README into smaller parts, etc.

This is still a technical project though since you will need to deal with TypeScript, Markdown, HTML and CSS (and any other technology that might help) to build the new documentation.

Expected Outcome: A new documentation with complete scripts to build it along with CI integration.

Difficulty Level: High

Skills Required: TypeScript, JavaScript, CSS, HTML, Markdown rendering.

Potential Mentor(s): [Daeraxa](https://discourse.joplinapp.org/u/Daeraxa), [Laurent](https://github.com/laurent22/)

Expected size of project: 350 hours

## 4. Implement default plugins on desktop application

We would like to bundle certain plugins with the desktop application, such as the Backup or Rich Markdown plugin. Some process needs to be implemented so that they are bundled and updated automatically. You'll have to consider how it will work on CI, and across platform. The process should be fault tolerant and retry when something fails.

Expected Outcome: A system for bundling certain plugins with Joplin releases, along with accompanying documentation on how to bundle plugins.

Difficulty Level: High

Skills Required: TypeScript, JavaScript, knowledge of Electron and GitHub Actions.

Potential Mentor(s): [CalebJohn](https://github.com/CalebJohn/), [JackGruber](https://discourse.joplinapp.org/u/JackGruber)

Expected size of project: 350 hours

## 5. Implement a toolbar for the mobile beta code editor

We would like the Beta code editor to eventually become the main editor, and for that a number of changes need to be made. The main one would be the addition of a toolbar to it, to set the various styles, such as Bold, Bullet list, Header, etc. Additionally there are number of bugs that will have to be fixed to get the editor ready for production - you will find them in the list of issues (under the "high" and "mobile" label).

Expected Outcome: Main: A new mobile editor toolbar. Secondary: Fix the bugs in the beta editor 

Difficulty Level: High

Skills Required: TypeScript, JavaScript, React Native, React Hooks. You'll also need to learn about CodeMirror 6 if you're not already familiar with it.

Potential Mentor(s): [CalebJohn](https://github.com/CalebJohn/), [Laurent](https://github.com/laurent22/)

Expected size of project: 350 hours

## 6. Improve integration of the richtext/WYSIWYG editor

Joplin offers a richtext/WYSIWYG typing experience alongside the Markdown editor but there are a number of areas that could do with improvement when it comes to integration with Joplin as a whole.

Areas for consideration include increasing compatibility with Joplin-wide keybindings (many are currently static), limiting features of the editor not compatible with markdown formatting, reducing the impact of data changes caused by swapping between editors.

Also read the document about limitations of the editor: [https://joplinapp.org/rich_text_editor/](https://joplinapp.org/rich_text_editor/)

Expected Outcome: Removal of non-functional formatting options, alignment of generic Joplin editor options as well general improvements in editor usability.

Difficulty level: High

Skills Required: Typescript, Javascript, CSS, HTML, Markdown rendering. You will also need to learn about TinyMCE if you're not already familiar with it.

Potential Mentor(s): [Daeraxa](https://discourse.joplinapp.org/u/Daeraxa)

Expected size of project: 175 hours

## 7. Improve PDF export

Joplin uses Chrome's built-in print to PDF function which is very limited. This can be improved by using a 3rd party library to convert notes to PDF. Applies to desktop and CLI versions.

Potential benefits:

* Export multiple notes as a single PDF

* Embedding attachments (see https://github.com/laurent22/joplin/issues/5943)

* Delay export until the note is fully rendered (https://discourse.joplinapp.org/t/ability-to-delay-pdf-export-to-allow-plugins-to-render/22159)

Expected Outcome: PDF export no longer relies on Chrome print to pdf

Difficulty level: Medium

Skills Required: Typescript, Javascript.

Potential Mentor(s): [Roman](https://discourse.joplinapp.org/u/roman_r_m), [CalebJohn](https://github.com/CalebJohn/)

Expected size of project: 350 hours

## 8. Replace built-in PDF renderer with a library

Just like with export, Joplin relies on the built-in PDF renderer to show PDF attachments. Replacing it with a 3rd-party library has a number of advantages:

* Joplin can preserve PDF viewer state when a note is re-rendered. For instance currently after opening and closing settings, PDF are reset to the 1st page.

* It may be possible to link to a specific page or even a location within a PDF document.

* Annotate PDF documents from Joplin

Expected Outcome: a library is used to render PDFs

Difficulty level: Medium

Skills Required: Typescript, Javascript.

Potential Mentor(s): [Roman](https://discourse.joplinapp.org/u/roman_r_m), [CalebJohn](https://github.com/CalebJohn/)

Expected size of project: 350 hours

## 9. Rebuild file system sync on Android

A recent update broke file system synchronization on Android, as applications are now required to use a new API to access storage. Currently there are no libraries that would proxy this API for React Native. If we want to get file system sync working again it has to be written from scratch.

Expected Outcome: File system sync works on all Android versions

Difficulty level: High

Skills Required: Android, Java/Kotlin, Typescript.

Potential Mentor(s): [Roman](https://discourse.joplinapp.org/u/roman_r_m)

Expected size of project: 175 hours

## 10. Tablet layout

On wide screens devices like tables Joplin could use a different layout, e.g. with note list always showing, or have both editor and viewer visible at the same time. What component is visible shoud be optional - for example, the user may want to see the note list, but hide the sidebar. This change will have to be implemented in such a way that it doesn't break the regular, mobile-only layout.

Expected Outcome: A new tablet-specific layout, with sidebar, note list and editor always visible.

Difficulty Level: High

Skills Required: React, Typescript, CSS.

Potential Mentor(s): [Laurent](https://github.com/laurent22/)

Expected size of project: 350 hours

## 11. Improve plugin search and discoverability

As there are more and more plugins it would be good to improve how they are discovered, and to improve search - in particular improve search relevance.

In practice, we would want the following:

- A page under `joplinapp.org/plugins` that lists recommended plugins, trending plugins, etc. similar to [Add-ons for Firefox](https://addons.mozilla.org/en-GB/firefox/). From here it should also be possible to search for plugins.

- Each plugin should have a page under `joplinapp.org/plugins/PLUGIN_NAME` that provides detailed info about the plugin (info would come from manifest.json). If the plugin manifest links to a README file perhaps we can also fetch it and display it there?

- In the app, use the info from stats.json to order the plugin - those with more downloads going on top for example

All the above can be done using the [info from the plugin repo](https://github.com/joplin/plugins#readme), in particular using manifests.json and stats.json. You would use this to implement the above functionalities. Moreover, the `joplinapp.org` pages should be dynamically generated using a script and this should be integrated with CI.

Expected Outcome: Primary: An automatically generated website under `joplinapp.org/plugins`. Secondary: Improved plugin search in the desktop app

Difficulty Level: Medium

Skills Required: Typescript, CSS, GitHub Actions.

Potential Mentor(s): [JackGruber](https://discourse.joplinapp.org/u/JackGruber), [Laurent](https://github.com/laurent22/)

Expected size of project: 350 hours

## 12. Email plugin

Create a plugin to fetch mail via IMAP and convert messages to notes (including attachments). The plugin should be able to filter what messages it donwloads, e.g. based on the folder.

Additional features to consider:

- support more than one account

- convert HTML to Markdown

- delete/move received emails

Expected Outcome: Email plugin (with the features described above) is available to install from the plugin repo.

Difficulty Level: Medium

Skills Required: TypeScript, JavaScript.

Potential Mentor(s): [Roman](https://discourse.joplinapp.org/u/roman_r_m), [Laurent](https://github.com/laurent22/)

Expected size of project: 350 hours

## 13. Desktop application integration testing

The desktop app front end has a few unit tests to verify things like React hooks and certain utility functions. However we currently have no integration testing to verify for example that a change in one component didn't break something in another component. This project would be about setting up this integration testing for the desktop app. You would do the setup and probably also write a few tests to demonstrate that it's working as expected. More info at https://www.electronjs.org/docs/latest/tutorial/automated-testing

Expected Outcome: The student will have a good understanding on how to setup automated testing of the desktop app, and will have implemented automated testing for at least a subset of the application (e.g. Markdown editor and WYSIWYG editor)

Difficulty Level: High

Skills Required: TypeScript, JavaScript, Electron.

Potential Mentor(s): [CalebJohn](https://github.com/CalebJohn/), [Laurent](https://github.com/laurent22/)

Expected size of project: 350 hours

## 14. Client settings sync

Whenever settings are changed on one client these are not replicated to other clients connected to the same sync target.

This project would be about creating synchronisation between clients to allow a single configuration rather than having to set them up separately on each e.g. keyboard shortcuts, installed plugins, Markdown plugins, note history etc.

Expected Outcome: Generic cross platform options synchronisation as well as options specific to particular platform via the existing synchronisation feature.

Difficulty Level: High

Skills Required: TypeScript, JavaScript

Potential Mentor(s): [Daeraxa](https://discourse.joplinapp.org/u/Daeraxa), [JackGruber](https://discourse.joplinapp.org/u/JackGruber), [Laurent](https://github.com/laurent22/)

Expected size of project: 350 hours

# More info

- Make sure you read the [Joplin Google Summer of Code Introduction](https://joplinapp.org/gsoc2022/)
- To build the application, please read [BUILD.md](https://github.com/laurent22/joplin/blob/dev/BUILD.md)
- And before creating a pull request, please read the [pull request guidelines](https://joplinapp.org/gsoc2022/pull_request_guidelines/)
