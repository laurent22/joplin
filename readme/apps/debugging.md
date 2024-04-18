# How to enable debugging

It is possible to get the apps to display or log more information that might help debug various issues.

## Desktop application

If the application starts with a white screen, open **Help &gt; Toggle Development Tools** or **View &gt; Toggle Development Tools** in the menu. Then check in the console if there is any error or warning and please let us know about it.

Otherwise, follow these instructions:

1. Click on menu **Help &gt; Open Profile Directory** and add a file named "flags.txt" in your directory with the following content: `--open-dev-tools --debug --log-level debug`
2. Restart the application
3. The development tools should now be opened. Click the "Console" tab
4. Now repeat the action that was causing problem. The console might output warnings or errors - please add them to the GitHub issue. Also open log.txt in the config folder and if there is any error or warning, please also add them to the issue.

Make sure you disable debugging once you've finished. Leaving it enabled can cause your log.txt to grow very quickly. To disable debugging, simply delete the "flags.txt" file created.

### Crash reports

When the application crashes, a report is created in your [home directory](https://github.com/laurent22/joplin/blob/dev/readme/apps/home_directory.md) under the name `joplin_crash_dump_<DATE_TIME>.json`. If you experience a crash please share this log with the team by posting it to the [forum](https://discourse.joplinapp.org/), [GitHub](https://github.com/laurent22/joplin/issues) or [by email](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/AdresseSupport.png). You may also enable crash report auto-upload in the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md) in the "Application" section.

### Safe mode

Safe mode is a special mode that disables all plugins and renders the notes as plain text. You can use this if, for example, the app is crashing or freezing on startup, or is very slow to run. By starting in safe mode you can verify if it's an issue with the app itself or with one of the plugins. In some rare cases, certain notes can also freeze the app, and safe mode would allow you to either change the note or delete it if it causing problems.

There's two ways to start in safe mode:

- From the app, click on **Help &gt; Toggle safe mode**. The app will restart in safe mode.

- If that doesn't work, if for example the app freezes before you can access this menu, you can set a debug flag in "flags.txt" file, [as described above](#desktop-application). Simply set the content to `--safe-mode --open-dev-tools --debug --log-level debug`.

## CLI application

1. Start the app with `joplin --debug --log-level debug`
2. Check log.txt as specified above for the desktop application and attach the log to the GitHub issue (or just the warnings/errors if any). The profile directory would be in `~/.config/joplin`.

## Mobile application

1. In the [Configuration screen](https://github.com/laurent22/joplin/blob/dev/readme/apps/config_screen.md), press on the **Log button**, and from the options menu, press "share".
2. Attach the shared log (or just relevant portions) to the GitHub issue.

If you recently (within two weeks) upgraded from 12.11.x to version 12.12.x, [be sure to check the log for and remove any sensitive data shared with Joplin](https://github.com/laurent22/joplin/issues/8211).

### Creating a low-level bug report on Android

https://developer.android.com/studio/debug/bug-report

To get a bug report directly from your device, do the following:

1. Be sure you have [Developer Options](https://developer.android.com/studio/debug/dev-options) enabled.
2. In Developer options, tap Take bug report.
3. Select the type of bug report you want and tap Report.

After a moment you get a notification that the bug report is ready. To share the bug report, tap the notification.

### Creating a low-level bug report on iOS

Some crashes cannot be investigated using Joplin's own tools. In that case, it can be very helpful to provide a native iOS crash report.

For this, please follow these instructions:

You can send it to this address https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/AdresseSupport.png

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
