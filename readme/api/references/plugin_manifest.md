# Plugin Manifest

The manifest file is a JSON file that describes various properties of the plugin. If you use the Yeoman generator, it should be automatically generated based on the answers you've provided. The supported properties are:

Name | Required? | Description
--- | --- | ---
`manifest_version` | **Yes** | For now should always be "1".
`name` | **Yes** | Name of the plugin. Should be a user-friendly string, as it will be displayed in the UI.
`version` | **Yes** | Version number such as "1.0.0".
`app_min_version` | **Yes** | Minimum version of Joplin that the plugin is compatible with. In general it should be whatever version you are using to develop the plugin.
`description` | No | Detailed description of the plugin.
`author` | No | Plugin author name.
`homepage_url` | No | Homepage URL of the plugin. It can also be, for example, a link to a GitHub repository.

Here's a complete example:

```json
{
    "manifest_version": 1,
    "name": "Joplin Simple Plugin",
    "description": "To test loading and running a plugin",
    "version": "1.0.0",
    "author": "John Smith",
    "app_min_version": "1.4",
    "homepage_url": "https://joplinapp.org"
}
```
