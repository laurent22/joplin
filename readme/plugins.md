# Plugins

The **desktop app** has the ability to extend beyond its standard functionality by the way of plugins. These plugins adhere to the Joplin [plugin API](https://joplinapp.org/api/references/plugin_api/classes/joplin.html) and can be installed & configured within the application via the `Plugins` page of the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md).  
From this menu you can search for plugins uploaded to the plugin repository as well as manual installation of plugins using a 'Joplin Plugin Archive' (*.jpl) file.  
Once the application is reloaded the plugins will appear within the plugins menu where they can be toggled on/off or removed entirely.

## Plugin Repository

Plugins are hosted within the [Joplin plugins](https://github.com/joplin/plugins) repository. The application searches and installs plugins from this location but manual download and install of the .jpl files is also supported.

See the [Joplin Discourse 'plugins' category](https://discourse.joplinapp.org/c/plugins/18) for plugin readmes, beta/in-development plugins and community discussion.

## Installing a plugin

To install a plugin just search for the name of the plugin within the search box within the `Plugins` page of the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md). Typing a <kbd>space</kbd> will display all plugins or you can browse the repository by pressing the `Plugin tools` "gear" button and selecting `Browse all plugins`.  
[Recommended plugins](https://github.com/joplin/plugins/blob/master/readme/recommended.md#recommended-plugins) are marked by a gold crown icon and have been vetted and recommended by the Joplin team.  
To install a plugin just press its `Install` button, the application will then require restarting to finish the installation and will prompt you to do so.  

Alternatively to install a plugin manually pressing the `Plugin tools` "gear" button and select `Install from file` then select the downloaded *.jpl file. Alternatively you can copy the *.jpl to your profile's `plugins` directory directory `~/.config/joplin-desktop/plugins` (This path might be different on your device - check at the top of the `Options` page in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/config_screen.md)). The plugin will be automatically loaded and executed when you restart the application. You may need to check Joplin is not minimising to the system tray/notification area rather than fully closing.

## Managing Plugins

Within the Joplin Plugins page you have the option to turn individual plugins on or off using the toggle control. After changing the state of a plugin Joplin must be restarted, you may need to check Joplin is not minimising to the system tray/notification area rather than fully closing.

As the plugins integrate into the application itself, each plugin may have its own configuration options within Joplin and may be executed in a number of different ways. Ensure that you read the author's documentation fully to understand how each plugin is designed to be configured and used.

## Updating Plugins

Plugins can be automatically updated from within the Joplin application. When an update is available an orange `Update` button will show on the `Plugins` page of the settings menu. Press this button to update and once it has finished it will prompt you to restart the application.

## Uninstalling plugins

Within the Joplin Plugins page you can hit the 'Delete' button on a plugin and it will be removed from the list. Joplin must be restarted for this to complete. You may need to check Joplin is not minimising to the system tray/notification area rather than fully closing.

Alternatively you can simply remove *.jpl from the plugin directory (see Installing a plugin section). The change will be reflected on application restart.

## Development

There is documentation of the plugin API along with documentation on plugin development. Check the [Joplin API Overview](https://github.com/laurent22/joplin/blob/dev/readme/api/overview.md) page for these items.
For community discussion and assistance on plugin development please also see the [Joplin Discourse `plugins development` category](https://discourse.joplinapp.org/c/development/plugins/19).
Other resources can be found in the `Joplin API - Get Started` and `Joplin API - Reference` categories on the [Joplin Help page](https://joplinapp.org/help/)
