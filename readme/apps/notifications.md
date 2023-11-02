# Notifications

In the desktop and mobile apps, an alarm can be associated with any to-do. It will be triggered at the given time by displaying a notification. How the notification will be displayed depends on the operating system since each has a different way to handle this. Please see below for the requirements for the desktop applications:

- **Windows**: >= 8. Make sure the Action Center is enabled on Windows. Task bar balloon for Windows < 8. Growl as fallback. Growl takes precedence over Windows balloons.
- **macOS**: >= 10.8 or Growl if earlier.
- **Linux**: `notify-send` tool, delivered through packages `notify-osd`, `libnotify-bin` or `libnotify-tools`. GNOME should have this by default, but install `libnotify-tools` if using KDE Plasma.

See [documentation and flow chart for reporter choice](https://github.com/mikaelbr/node-notifier/blob/master/DECISION_FLOW.md)

On mobile, the alarms will be displayed using the built-in notification system.

If for any reason the notifications do not work, please [open an issue](https://github.com/laurent22/joplin/issues).