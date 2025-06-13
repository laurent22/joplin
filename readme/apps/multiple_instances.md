# Running multiple instances of Joplin

Joplin Desktop offers the capability to run **multiple instances** of the application simultaneously. Each instance is a separate application with its own configuration, plugins, and settings, meaning changes made in one instance do not affect the other. This feature is particularly useful for users who wish to maintain a clear separation between work and personal notes or utilise Joplin in multi-desktop environments.

## Key Features of Multiple Instances

1. **Independent Applications**:  

Each instance is completely isolated, operating as a standalone version of Joplin. This ensures no overlap in settings, plugins, or notes between instances.

2. **Use Case Scenarios**:  
	
- Maintain separate environments for work and personal notes.  
- Use Joplin on multi-desktop setups, with an instance on each virtual desktop.

## Supported Number of Instances

Currently, Joplin supports up to **two running instances**:  

1. **Primary Instance**: The primary application instance, with full access to all Joplin features.  

2. **Secondary Instance**: A secondary application instance that functions independently. However, it does not support the **Web Clipper service**, which can only run in the main instance.

## How to Launch a Second Instance

To start a second instance of Joplin:  

1. Open the main Joplin application.  

2. Navigate to the menu and select:  

**File** => **Open secondary app instance...**  

3. A new instance of Joplin will open with its own profile.  

This second instance operates independently, allowing you to customise it as needed.

## Caveats

### Launching the primary instance when the secondary instance is active

Technically, the secondary instance is still initiated from the same executable file, which might confuse the operating system. Most operating systems reasonably assume that if you attempt to launch a GUI application that is already running, your intention is to bring that application into focus.

In practical terms, this means the following:

If you close the primary instance while the secondary instance remains open, and then attempt to reopen the primary instance—for instance, by clicking on its icon—the operating system will most likely refocus on the secondary instance instead of launching the primary one. To address this issue, the secondary instance includes a menu item labelled **Open primary app instance...**. Clicking on this option will explicitly launch the primary instance.

In the same way, the secondary instance should generally be launched only from the first one, using the **Open secondary app instance...** menu item.
