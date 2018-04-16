# How to enable debugging

It is possible to get the apps to display or log more information that might help debug various issues.

## Desktop application

- Add a file named "flags.txt" in the config directory (should be `~/.config/joplin-desktop` or `c:\Users\YOUR_NAME\.config\joplin-desktop`) with the following content: `--open-dev-tools --log-level debug`
- Restart the application
- The development tools should now be opened. Click the "Console" tab
- Now repeat the action that was causing problem. The console might output warnings or errors - please add them to the GitHub issue. Also open log.txt in the config folder and if there is any error or warning, please also add them to the issue.

## CLI application

- Start the app with `joplin --log-level debug`
- Check the log.txt as specified above for the desktop application and attach the log to the GitHub issue (or just the warnings/errors if any)

## Mobile application

- In the options, enable Advanced Option
- Open the log in the top right hand corner menu and post a screenshot of any error/warning.
