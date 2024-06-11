---
sidebar_position: 0.5
---

# Installation

Three types of applications are available: for **desktop** (Windows, macOS and Linux), for **mobile** (Android and iOS) and for **terminal** (Windows, macOS, Linux and FreeBSD). All the applications have similar user interfaces and can synchronise with each other.

## Desktop applications

Operating System | Download
---|---
Windows (32 and 64-bit) | <a href='https://objects.joplinusercontent.com/v2.14.22/Joplin-Setup-2.14.22.exe?source=JoplinWebsite&type=New'><img alt='Get it on Windows' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeWindows.png'/></a>
macOS | <a href='https://objects.joplinusercontent.com/v2.14.22/Joplin-2.14.22.dmg?source=JoplinWebsite&type=New'><img alt='Get it on macOS' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeMacOS.png'/></a>
macOS M1 (Apple Silicon) | <a href='https://objects.joplinusercontent.com/v2.14.22/Joplin-2.14.22-arm64.DMG?source=JoplinWebsite&type=New'><img alt='Get it on macOS M1 (Silicon)' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeMacOSM1.png'/></a>
Linux | <a href='https://objects.joplinusercontent.com/v2.14.22/Joplin-2.14.22.AppImage?source=JoplinWebsite&type=New'><img alt='Get it on Linux' width="134px" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeLinux.png'/></a>

**On Windows**, you may also use the <a href='https://objects.joplinusercontent.com/v2.14.22/JoplinPortable.exe?source=JoplinWebsite&type=New'>Portable version</a>. The [portable application](https://en.wikipedia.org/wiki/Portable_application) allows installing the software on a portable device such as a USB key. Simply copy the file JoplinPortable.exe in any directory on that USB key ; the application will then create a directory called "JoplinProfile" next to the executable file.

**On Linux**, the recommended way is to use the following installation script as it will handle the desktop icon too:

<pre><code style="word-break: break-all">wget -O - https://raw.githubusercontent.com/laurent22/joplin/dev/Joplin_install_and_update.sh | bash</code></pre>

The install and update script supports the [following flags](https://github.com/laurent22/joplin/blob/dev/Joplin_install_and_update.sh#L50) (around line 50 at the time of this writing).

## Mobile applications

Operating System | Download | Alt. Download
---|---|---
Android | <a href='https://play.google.com/store/apps/details?id=net.cozic.joplin&utm_source=GitHub&utm_campaign=README&pcampaignid=MKT-Other-global-all-co-prtnr-py-PartBadge-Mar2515-1'><img alt='Get it on Google Play' style="max-height: 40px;" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeAndroid.png'/></a> | or download the [APK file](https://objects.joplinusercontent.com/v2.14.9/joplin-v2.14.9.apk?source=JoplinWebsite&type=New)
iOS | <a href='https://itunes.apple.com/us/app/joplin/id1315599797'><img alt='Get it on the App Store' style="max-height: 40px;" src='https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/BadgeIOS.png'/></a> | -

## Terminal application

Operating system | Method
-----------------|----------------
macOS, Linux, or Windows (via [WSL](https://msdn.microsoft.com/en-us/commandline/wsl/faq?f=255&MSPPError=-2147217396)) | **Important:** First, [install Node 12+](https://nodejs.org/en/download/package-manager/).<br/><br/>`NPM_CONFIG_PREFIX=~/.joplin-bin npm install -g joplin`<br/>`sudo ln -s ~/.joplin-bin/bin/joplin /usr/bin/joplin`<br><br>By default, the application binary will be installed under `~/.joplin-bin`. You may change this directory if needed. Alternatively, if your npm permissions are setup as described [here](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-2-change-npms-default-directory-to-another-directory) (Option 2) then simply running `npm -g install joplin` would work.

To start it, type `joplin`.

For usage information, please refer to the full [Joplin Terminal Application Documentation](https://joplinapp.org/help/apps/terminal/).

## Web Clipper

The Web Clipper is a browser extension that allows you to save web pages and screenshots from your browser. For more information on how to install and use it, see the [Web Clipper Help Page](https://github.com/laurent22/joplin/blob/dev/readme/apps/clipper.md).

## Unofficial Alternative Distributions

There are a number of unofficial alternative Joplin distributions. If you do not want to or cannot use appimages or any of the other officially supported releases then you may wish to consider these.

However these come with a caveat in that they are not officially supported so certain issues may not be supportable by the main project. Rather support requests, bug reports and general advice would need to go to the maintainers of these distributions.

A community maintained list of these distributions can be found here: [Unofficial Joplin distributions](https://discourse.joplinapp.org/t/unofficial-alternative-joplin-distributions/23703)