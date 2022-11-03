# How to add a new default plugin
 
To add a new default plugin for desktop:
- Add the plugin ID and pinned version to `defaultPlugins` object located in [desktopDefaultPluginsInfo.ts](https://github.com/laurent22/joplin/blob/eb7083d7888433ff6ef76ccfb7fb87ba951d513f/packages/lib/services/plugins/defaultPlugins/desktopDefaultPluginsInfo.ts#L5)
- If necessary, you can also add default settings for the plugins. 

- For example, if you wanted to add 2 default settings, `settingName1` and `settingName2`, then you will modify the `defaultPlugins` object in following way:

    ```
    const defaultPlugins = {
        'samplePluginId': {
            version: '1.0.0',
            settings: {
                'settingName1': 'setting-value1',
                'settingName2': 'setting-value2',
            },
        },
    };
    ```

## Bundling of default plugins

Script for bundling default plugins is present in [bundleDefaultPlugins.ts](https://github.com/laurent22/joplin/blob/eb7083d7888433ff6ef76ccfb7fb87ba951d513f/packages/tools/bundleDefaultPlugins.ts)

Every time a new desktop release is being built, we compare the local default plugins version with pinned plugin version mentioned in [desktopDefaultPluginsInfo.ts](https://github.com/laurent22/joplin/blob/eb7083d7888433ff6ef76ccfb7fb87ba951d513f/packages/lib/services/plugins/defaultPlugins/desktopDefaultPluginsInfo.ts)

If there is a newer version available, we will pull the `tgz` file of plugin from NPM registry and extract it. We will then move `manifest.json` and `plugin.jpl` to the build folder of desktop.

## Installing of default plugins

- All the functions related to default plugins are located in [defaultPluginsUtils.ts](https://github.com/laurent22/joplin/blob/eb7083d7888433ff6ef76ccfb7fb87ba951d513f/packages/lib/services/plugins/defaultPlugins/defaultPluginsUtils.ts)
- On every startup, we check if there are new plugins available in build folder that have not been installed yet. After installing the new plugin, we update the `installedDefaultPlugins` array in `Setting.ts` with respective plugin ID for future reference.
- After installing is complete, we apply the default settings for each default plugin. Default settings are located in [desktopDefaultPluginsInfo.ts](https://github.com/laurent22/joplin/blob/eb7083d7888433ff6ef76ccfb7fb87ba951d513f/packages/lib/services/plugins/defaultPlugins/desktopDefaultPluginsInfo.ts)
- If the plugin is already installed by the user, then we don't apply default settings to avoid overriding user's settings.