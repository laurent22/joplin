# Plugin system architecture

The plugin system assumes a multi-process architecture, which is safer and easier to manage. For example if a plugin freezes or crashes, it doesn't bring down the app with it. It also makes it easier to find the source of problem when there is one - eg. we know that process X has crashed so the problem is with the plugin running inside. The alternative, to run everything within the same process, would make it very hard to make such a diagnostic. Once a plugin call is frozen in an infinite loop or crashes the app, we can't know anything.

## Main architecture elements

### Plugin script

Written by the user and loaded by Joplin, it's a simple JavaScript file that makes calls to the plugin API. It is loaded in a separate process.

### Sandbox proxy

It is loaded in the same process as the plugin script. Whenever the plugin script calls a plugin API function (eg. joplin.commands.execute) it goes through this proxy. The proxy then converts the call to a plain string and use IPC to send the call to the plugin host. The plugin host executes the function on the plugin API then sends back the result by IPC call again.

### Plugin host

The plugin host is simply the main application. Its role is to start and initialise the plugin service and to load plugins from the provided script files.

### Plugin service

It is used to load and run plugins. Running plugins is platform-specific, thus this part is injected into the service via a platform-specific Plugin Runner.

### Plugin runner

This is the platform-specfic way to load and run a plugin. For example, on desktop, it creates a new BrowserWindow (which is a new process), then load the script inside. On Cli, for now the "vm" package is used, so the plugin actually runs within the same process.

The plugin runner also initialises the sandbox proxy and injects it into the plugin code.

### Plugin API

The plugin API is a light wrapper over Joplin's internal functions and services. All the platforms share some of the plugin API but there can also be some differences. For example, the desktop app exposes the text editor component commands, and so this part of the plugin API is available only on desktop. The difference between platforms is implemented using the PlatformImplementation class, which is injected in the plugin service on startup.

## Handling events between the plugin and the host

Handling events in plugins is relatively complicated due to the need to send IPC messages and the limitations of the IPC protocol, which in particular cannot transfer functions.

For example, let's say we define a command in the plugin:

```typescript
joplin.commands.register({
	name: 'testCommand1',
	label: 'My Test Command 1',
}, {
	onExecute: (args:any) => {
		alert('Testing plugin command 1');
	},
});
```

The "onExecute" event handler needs to be called whenever, for example, a toolbar button associated with this command is clicked. The problem is that it is not possible to send a function via IPC (which can only transfer plain objects), so there has to be a translation layer in between.

The way it is done in Joplin is like so:

In the **sandbox proxy**, the event handlers are converted to string event IDs and the original event handler is stored in a map before being sent to host via IPC. So in the example above, the command would be converted to this plain object:

```typescript
{
	name: 'testCommand1',
	label: 'My Test Command 1',
}, {
	onExecute: '___event_handler_123',
}
```

Then, still in the sandbox proxy, we'll have a map called something like `eventHandlers`, which now will have this content:

```typescript
eventHandlers['___event_handler_123'] = (args:any) => {
	alert('Testing plugin command 1');
}
```

In the **plugin runner** (Host side), all the event IDs are converted to functions again, but instead of performing the action directly, it posts an IPC message back to the sandbox proxy using the provided event ID.

So in the host, the command will now look like this:

```typescript
{
	name: 'testCommand1',
	label: 'My Test Command 1',
}, {
	onExecute: (args:any) => {
		postMessage('pluginMessage', { eventId: '___event_handler_123', args: args });
	};
}
```

At this point, any code in the Joplin application can call the `onExecute` function as normal without having to know about the IPC translation layer.

When the function onExecute is eventually called, the IPC message is sent back to the sandbox proxy, which will decode it and execute it.

So on the **sandbox proxy**, we'll have something like this:

```typescript
window.addEventListener('message', ((event) => {
	const eventId = getEventId(event); // Get back the event ID (implementation might be different)
	const eventArgs = getEventArgs(event); // Get back the args (implementation might be different)
	if (eventId) {
		// And call the event handler
		eventHandlers[eventId](...eventArgs);
	}	
}));
```