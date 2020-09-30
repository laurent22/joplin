# Plugin system architecture

The plugin system assumes a multi-process architecture, which is safer and easier to manage. For example if a plugin freezes or crashes, it doesn't bring down the app with it. It also makes it easier to find the source of problem when there is one - eg. we know that process X has crashed so the problem is with the plugin running inside. The alternative, to run everything within the same process, would make it very hard to make such diagnostic. Once a plugin call is frozen in an infinite loop or crashes the app, we can't know anything.

## Main architecture elements

### Plugin script

Written by the user and loaded by Joplin, it's a simple JavaScript file that makes call to the plugin API. It is loaded in a separate process.

### Sandbox proxy

It is loaded in the same process as the plugin script. Whenever the plugin script calls a plugin API function (eg. joplin.commands.execute) it goes through this proxy. The proxy then converts the call to a plain string and use IPC to send the call to the plugin host. The plugin host executes the function on the plugin API then send back the result by IPC call again.

### Plugin host

The plugin host is simply the main application. Its role is to start and initialise the plugin service and to load plugins from the provided script files.

### Plugin service

It is used to load and run plugins. Running plugins is platform-specific, thus this part is injected into the service via a platform-specific Plugin Runner.

### Plugin runner

This is the platform-specfic way to load and run a plugin. For example, on desktop, it creates a new BrowserWindow (which is a new process), then load the script inside. On Cli, for now the "vm" package is used, so the plugin actually runs within the same process.

The plugin runner also initialises the sandbox proxy and injects it into the plugin code.

### Plugin API

The plugin API is a light wrapper over Joplin's internal functions and services.