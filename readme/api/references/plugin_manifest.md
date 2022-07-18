# Plugin Manifest

The manifest file is a JSON file that describes various properties of the plugin. If you use the Yeoman generator, it should be automatically generated based on the answers you've provided. The supported properties are:

Name | Type | Required? | Description
--- | --- | --- | ---
`manifest_version` | number | **Yes** | For now should always be "1".
`name` | string | **Yes** | Name of the plugin. Should be a user-friendly string, as it will be displayed in the UI.
`version` | string | **Yes** | Version number such as "1.0.0".
`app_min_version` | string | **Yes** | Minimum version of Joplin that the plugin is compatible with. In general it should be whatever version you are using to develop the plugin.
`description` | string | No | Detailed description of the plugin.
`author` | string | No | Plugin author name.
`keywords` | string[] | No | Keywords associated with the plugins. They are used in search in particular.
`homepage_url` | string | No | Homepage URL of the plugin. It can also be, for example, a link to a GitHub repository.
`repository_url` | string | No | Repository URL where the plugin source code is hosted.
`categories` | string[] | No | [Categories](#categories) that describes the functionality of the plugin. 
`media` | string[] | No  | Media urls related to the plguin. It is used for listing on Joplin Plugin website.

## Categories

| Category | Description |
| --- | --- |
| appearance | dealing with appearance of some element/s of the app. For example line numbers, layout, etc. |
| developer tools |  built for the developers. |
| editor |  enhancing note editor. |
| files |  dealing with files. For example import, export, backup, etc. |
| integrations | integrating third party services or apps. |
| personal knowledge management | managing and organizing notes. |
| productivity | making Joplin more productive to use. |
| search |  enhancing search inside the app. |
| tags |  dealing with note tags. |
| themes |  changing theme of the app. |
| viewer | enhancing the rendering of a note. |

## Media

You can store media such as images and videos in this field for listing on Joplin Plugin website.
| Field | Description |
| --- | --- |
| url | a remote url to your media |
| type |  MIME type of your media, it can be `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`, and `video/ogg` |
| platform | a string that can define the distribution platform for which the specific media should apply to, it can be `destktop` or `mobile` |
| label | a string that serves as an accessible name for the media |


## Manifest example

```json
{
    "manifest_version": 1,
    "name": "Joplin Simple Plugin",
    "description": "To test loading and running a plugin",
    "version": "1.0.0",
    "author": "John Smith",
    "app_min_version": "1.4",
    "homepage_url": "https://joplinapp.org",
    "media": [{
        "url": "https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/ImageSources/RoundedCorners_64x64.png",
        "type": "image/png",
        "platform": "desktop",
        "label": "Description"
    }]
}
```
