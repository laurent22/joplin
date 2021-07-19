# Plugins

The **desktop app** has the ability to extend beyond its standard functionality by the way of plugins. These plugins adhere to the Joplin plugin API and can be installed & configured within the application via the `Plugins` page of the Settings menu (*Windows/Linux*: Tools > Options > Plugins; *macOS*: Joplin > Preferences). This menu allows the manual installation of the plugin using the single 'Joplin Plugin Archive' (*.jpl) file. Once the application is reloaded the plugins will appear within the plugins menu where they can be toggled on/off or removed entirely.

## Plugin Repository

Plugins are currently maintained by the community in the [Joplin Discourse 'plugins' category](https://discourse.joplinapp.org/c/plugins/18).

## Installing a plugin

To install a plugin press the Install Plugin button within the `Plugins` page of the Configuration screen and select the *.jpl file. Alternatively you can copy the *.jpl to your profile's `plugins` directory directory `~/.config/joplin-desktop/plugins` (This path might be different on your device - check at the top of the `Options` page in the Configuration screen). The plugin will be automatically loaded and executed when you restart the application. You may need to check Joplin is not minimising to the system tray/notification area rather than fully closing.

## Managing Plugins

Within the Joplin Plugins page you have the option to turn individual plugins on or off using the toggle control. After changing the state of a plugin Joplin must be restarted, you may need to check Joplin is not minimising to the system tray/notification area rather than fully closing.

As the plugins integrate into the application itself, each plugin may have its own configuration options within Joplin and may be executed in a number of different ways. Ensure that you read the author's documentation fully to understand how each plugin is designed to be configured and used.

## Uninstalling plugins

Within the Joplin Plugins page you can hit the 'Delete' button on a plugin and it will be removed from the list. Joplin must be restarted for this to complete. You may need to check Joplin is not minimising to the system tray/notification area rather than fully closing.

Alternatively you can simply remove *.jpl from the plugin directory (see Installing a plugin section). The change will be reflected on application restart.

## Development

There is documentation of the plugin API along with documentation on plugin development. Check the [Joplin API Overview](https://github.com/laurent22/joplin/blob/dev/readme/api/overview.md) page for these items.
