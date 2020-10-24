# How to enable debugging

It is possible to get the apps to display or log more information that might help debug various issues.

## Desktop application

- Add a file named "flags.txt" in the config directory (should be `~/.config/joplin-desktop` or `c:\Users\YOUR_NAME\.config\joplin-desktop`) with the following content: `--open-dev-tools --debug --log-level debug`
- Restart the application
- The development tools should now be opened. Click the "Console" tab
- Now repeat the action that was causing problem. The console might output warnings or errors - please add them to the GitHub issue. Also open log.txt in the config folder and if there is any error or warning, please also add them to the issue.

## CLI application

- Start the app with `joplin --debug --log-level debug`
- Check the log.txt as specified above for the desktop application and attach the log to the GitHub issue (or just the warnings/errors if any)

## Mobile application

- In the options, enable Advanced Option
- Open the log in the top right hand corner menu and post a screenshot of any error/warning.

# Creating a low-level bug report on Android

https://developer.android.com/studio/debug/bug-report

To get a bugreport directly from your device, do the following:

- Be sure you have [Developer Options](https://developer.android.com/studio/debug/dev-options) enabled.
- In Developer options, tap Take bug report.
- Select the type of bug report you want and tap Report.

After a moment you get a notification that the bug report is ready. To share the bug report, tap the notification.

# Creating a low-level bug report on iOS

Some crashes cannot be investigated using Joplin's own tools. In that case, it can be very helpful to provide a native iOS crash report.

For this, please follow these instructions:

You can send it to this address https://raw.githubusercontent.com/laurent22/joplin/master/Assets/AdresseSupport.png

https://developer.apple.com/library/content/qa/qa1747/_index.html

Getting Crash Logs Directly From a Device Without Xcode

Your users can retrieve crash reports from their device and send them to you via email by following these instructions.

(It is not possible to get device console logs directly from a device)

1) Open Settings app

2) Go to Privacy, then Diagnostics & Usage

3) Select Diagnostics & Usage Data

4) Locate the log for the crashed app. The logs will be named in the format: `<AppName>_<DateTime>_<DeviceName>`

5) Select the desired log. Then, using the text selection UI select the entire text of the log. Once the text is selected, tap Copy

6) Paste the copied text to Mail and send to an email address as desired
