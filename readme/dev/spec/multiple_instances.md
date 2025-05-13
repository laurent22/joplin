# Multiple instance support

Joplin Desktop supports multiple instances through **profile locking** and **IPC messaging**.

### Profile Locking

- A lock file is updated every `x` seconds by each instance.

- If a valid lock exists, the new instance sends a message to all running instances and closes. This message prompts the other active instance to move to the front.

### IPC Messaging

- IPC is implemented using lightweight HTTP servers in each instance, communicating via `POST` requests.

- When a message is sent, the implementation automatically discovers running IPC servers.

- Messages are secured using a secret that is shared by all applications. That secret is read from the profile directory of the main instance. It is created by the server if it doesn't exist. This ensures that, for example, a browser cannot send a valid message to the apps.

### Instance Differentiation

- The `--alt-instance-id` flag must be used to launch an alternative instance. This disables services like the Web Clipper.

- The `altInstanceId` setting is consulted by the application to determine its type (main or alternative instance).

### Current Limitations

The system is designed to handle multiple instances but currently supports only two through the UI: a **main instance** and an **alternative instance**.