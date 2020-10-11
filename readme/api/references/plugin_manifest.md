# Plugin Manifest

The manifest file is a JSON file that describes various properties of the plugin. If you use the Yeoman generator, it should be automatically generated based on the answers you've provided. The supported properties are:

- `manifest_version`: For now should always be "1"
- `name`: Name of the plugin
- `description`: Additional information about the plugin
- `version`: Version number such as "1.0.0"
- `homepage_url`: Homepage URL of the plugin (can also be, for example, a link to a GitHub repository)

Here's a complete example:

```json
{
    "manifest_version": 1,
    "name": "Joplin Simple Plugin",
    "version": "1.0.0",
    "description": "To test loading and running a plugin",
    "homepage_url": "https://joplinapp.org"
}
```
