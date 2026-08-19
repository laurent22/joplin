# Home directory

Joplin stores some data in your home directory, such as your profile and certain files like crash reports. This directory will be in a location that depends on your operating system:

| Operating System | Path | Environment Variable |
| --- | --- | --- |
| Windows | `C:\\Users\\(username)` | `%UserProfile%` |
| Linux | `/home/(username)` | `$HOME` |
| macOS | `/Users/(Username)` | `$HOME` |

## Crash report directory

When Joplin crashes, it generates a crash report that can help diagnose the issue. The location of these crash reports varies by operating system:

| Operating System | Path | Environment Variable |
| --- | --- | --- |
| Windows | `C:\\Users\\(username)\\AppData\\Local\\CrashDumps` | `%LocalAppData%\CrashDumps` |
| Linux | `/home/(username)/.local/state/joplin` | `$XDG_STATE_HOME/joplin` |
| macOS | `/Users/(Username)/Library/Logs/DiagnosticReports` | `$HOME/Library/Logs/DiagnosticReports` |