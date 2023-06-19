# Debugging Server project with vscode

Using a debugger sometimes is much easier than trying to just print things to understand a bug, 
for the server project we have a configuration that makes easy for everyone to run in debug mode inside vscode.

In the debug screen you can select "Server" and hit the play button to start the process. 

![image](https://github.com/laurent22/joplin/assets/5051088/cda6e3d6-32f3-4997-bd16-8413a6c962c5)

Before running the server there is a task called `transpile-server` that runs `yarn tsc` to make sure that the 
latest changes in the `package/server` are being executed. 

https://github.com/laurent22/joplin/blob/4f37e6073ad549fe72206e2a125c27174b5d96a9/joplin.code-workspace#L360-L365

In a optiomal solution we would be doing this `transpile-server` task in the `tasks.json` file 
(inside the `tasks.json` we can use a `type` `npm` for the task that is more ergonomic)

If there is any new environment variables that need to be included before execution, there is a place where they can be added:

https://github.com/laurent22/joplin/blob/4f37e6073ad549fe72206e2a125c27174b5d96a9/joplin.code-workspace#L387-L391

Things that we could do to improve the experience is adding a build process to other projects that are used by the server project, 
but this still can be done with other terminals open.

### Modifying the configuration:

To modify the configuration, for now, it is all in the `jopli.code-workspace` file, but if the needed we could also break
the configuration in two files, one for the `launch.json` and other for the `tasks.json`.


### References:
[vscode debugger](https://code.visualstudio.com/docs/editor/debugging)

[Launch option to vscode workspaces](https://code.visualstudio.com/docs/editor/multi-root-workspaces#_debugging)

[vscode tasks](https://code.visualstudio.com/docs/editor/tasks)


### More images:

![image](https://github.com/laurent22/joplin/assets/5051088/1346d938-c376-4cab-82a7-98deb4283fe8)
![image](https://github.com/laurent22/joplin/assets/5051088/b3a12b9f-704c-4dc8-b2bd-14ba7a1c4759)
![image](https://github.com/laurent22/joplin/assets/5051088/c45becc4-44b7-4f95-9d49-421517e29592)

