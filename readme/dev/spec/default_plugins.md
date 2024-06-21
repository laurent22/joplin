# How to add a new default plugin
 
To add a new default plugin for desktop:
- Add the plugin ID and pinned version to `defaultPlugins` object located in [desktopDefaultPluginsInfo.ts](https://github.com/laurent22/joplin/blob/eb7083d7888433ff6ef76ccfb7fb87ba951d513f/packages/lib/services/plugins/defaultPlugins/desktopDefaultPluginsInfo.ts#L5)
- If necessary, you can also add default settings for the plugins. 

- For example, if you wanted to add 2 default settings, `settingName1` and `settingName2`, then you will modify the `defaultPlugins` object in following way:

```
const defaultPlugins = {
    'samplePluginId': {
        settings: {
            'settingName1': 'setting-value1',
            'settingName2': 'setting-value2',
        },
    },
};
```

After this, add the commit, branch, and clone URL to be build from to `pluginRepositories.json`.

For example,
```json
{
	"plugin.id.here": {
		"cloneUrl": "https://example.com/plugin-repo/plugin-repo-here.git",
		"branch": "main",
		"commit": "840d2e84b70adf6de961e167dcd27ddad088b286"
	}
}
```

## Patching the plugin

Some plugins need patching. To create or update a plugin's patch, run the `patch-plugin` command in the `packages/default-plugins/` directory.

For example,
```shell
$ cd packages/default-plugins
$ yarn patch-plugin plugin.id.here
```

The script will create a temporary directory in which changes can be made. Do not stage the changes that should appear in the patch.

## Bundling of default plugins

Scripts for bundling default plugins are present in `packages/default-plugins/`.

These are run by the `app-desktop` package on a full `build` (e.g. on `postinstall`).


## Installing of default plugins

- All the functions related to default plugins are located in [defaultPluginsUtils.ts](https://github.com/laurent22/joplin/blob/eb7083d7888433ff6ef76ccfb7fb87ba951d513f/packages/lib/services/plugins/defaultPlugins/defaultPluginsUtils.ts)
- Default plugins are bundled with the app (included in the `build/` directory) and loaded from this directory.
- To allow loading `dev` and NPM versions of the plugin, default plugins are loaded after non-default plugins. The plugin service refuses to load additional copies of already-loaded plugins. As such, non-default plugins take precedence over default plugins.
- After loading is complete, we apply the default settings for each default plugin. Default settings are located in [desktopDefaultPluginsInfo.ts](https://github.com/laurent22/joplin/blob/eb7083d7888433ff6ef76ccfb7fb87ba951d513f/packages/lib/services/plugins/defaultPlugins/desktopDefaultPluginsInfo.ts). The `installedDefaultPlugins` setting is used to ensure that settings are only overridden once.
- If the plugin is already installed by the user, then we don't apply default settings to avoid overriding user's settings.