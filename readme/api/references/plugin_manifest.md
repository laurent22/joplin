# Plugin Manifest

The manifest file is a JSON file that describes various properties of the plugin. If you use the Yeoman generator, it should be automatically generated based on the answers you've provided. The supported properties are:

Name | Type | Required? | Description
--- | --- | --- | ---
`manifest_version` | number | **Yes** | For now should always be "1".
`name` | string | **Yes** | Name of the plugin. Should be a user-friendly string, as it will be displayed in the UI.
`version` | string | **Yes** | Version number such as "1.0.0".
`app_min_version` | string | **Yes** | Minimum version of Joplin that the plugin is compatible with. In general it should be whatever version you are using to develop the plugin.
`app_min_version_mobile` | string | No | Minimum version of Joplin on mobile platforms, if different from `app_min_version`
`platforms` | string[] | No | List of platforms supported by the plugin. For example, `["desktop", "mobile"]`.
`description` | string | No | Detailed description of the plugin.
`author` | string | No | Plugin author name.
`keywords` | string[] | No | Keywords associated with the plugins. They are used in search in particular.
`homepage_url` | string | No | Homepage URL of the plugin. It can also be, for example, a link to a GitHub repository.
`repository_url` | string | No | Repository URL where the plugin source code is hosted.
`categories` | string[] | No | [Categories](#categories) that describes the functionality of the plugin. 
`screenshots` | Image[] | No  | [Screenshots](#Screenshot) are used for listing on Joplin Plugin website.
`icons` | Icons | No | If [Icons](#Icons) is not supplied, a standard plugin icon will be used by default. You should supply at least a main icon, ideally 48x48 px in size. This is the icon that will be used in various plugin pages. You may, however, supply icons of any size and Joplin will attempt to find the best icon to display in different components. Only PNG icons are allowed.
`promo_tile` | Image | No | [Promo tile](#promo-tile) is an optional image that is used to promote your plugin on the Joplin Plugins website.

## Platforms

A list that can contain `"desktop"` and/or `"mobile"`. If not given, it defaults to `[ "desktop" ]` for most plugins.

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
| tags | dealing with note tags. |
| themes |  changing theme of the app. |
| viewer | enhancing the rendering of a note. |

## Screenshot

| Properties | Description |
| --- | --- |
| src | a path or URL to a screenshot. If a path, `src` should be relative to the root of the repository (e.g. `screenshots/a.png`). |
| label | description of the image. This label will be used by screen readers or if the image cannot be loaded. |

**Note**: If `src` is a path and not a URL, either `repository_url` or `homepage_url` must point to a GitHub repository for the screenshot to appear on the Joplin Plugins Website. See [the relevant issue](https://github.com/joplin/website-plugin-discovery/issues/35).

## Icons

| Properties | Description |
| --- | --- |
| 16 | path to a PNG icon. |
| 32 | path to a PNG icon. |
| 48 | path to a PNG icon. |
| 128 | path to a PNG icon. |

Note: All paths should be relative to the root of the repository.

## Promo tile

This is an optional image that is displayed in the Joplin Plugin website main page. It is an opportunity to promote your plugin by using a catchy image. A good way to start with the promo tile is to display your icon or logo and the plugin name next to it. Have a look at the Chrome Web Store [which has many good examples of promo tiles](https://chromewebstore.google.com/category/extensions/lifestyle/social).

If no promo tile is provided, your plugin icon will be displayed instead.

| Properties | Description |
| --- | --- |
| src | a path or URL to a screenshot. It must be a **440 x 280 image** JPEG or PNG (no alpha). If a path, `src` should be relative to the root of the repository (e.g. `images/promo_tile.png`). |
| label | description of the image. This label will be used by screen readers or if the image cannot be loaded. |

## Manifest example

```json
{
    "manifest_version": 1,
    "name": "Joplin Simple Plugin",
    "description": "To test loading and running a plugin",
    "version": "1.0.0",
    "author": "John Smith",
    "app_min_version": "1.4",
    "app_min_version_mobile": "3.0.3",
    "platforms": ["mobile", "desktop"],
    "homepage_url": "https://joplinapp.org",
    "screenshots": [
      {
        "src": "images/screenshot.png",
        "label": "An example of the plugin being used"
      },
      {
        "src": "https://example.com/images/screenshot.png",
        "label": "The plugin loading screen"
      }
    ],
    "icons": {
      "16": "images/icon16.png",
      "32": "images/icon32.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    },
    "promo_tile": {
      "src": "images/promo_tile.png",
      "label": "A logo of a plugin on a clear background"
    }
}
```
