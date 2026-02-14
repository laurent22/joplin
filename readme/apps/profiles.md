# Multiple profile support
	
To create a new profile, open File > Switch profile and select Create new profile, enter the profile name and press OK. The app will automatically switch to this new profile, which you can now configure.

To switch back to the previous profile, again open File > Switch profile and select Default.

Note that profiles all share certain settings, such as language, font size, theme, etc. This is done so that you don't have reconfigure every details when switching profiles. Other settings such as sync configuration is per profile.

The feature is available on desktop and mobile.

## Creating a reusable custom profile

You might want to create a custom profile that can be reused in other situations. For example, when deploying the desktop application to multiple computers, you may want them all to start with the same predefined setup. To do this, follow these steps:

* Using the Joplin desktop application
* Delete [your local profile](https://github.com/laurent22/joplin/blob/dev/readme/dev/spec/user_profile.md), or rename it if you want to keep a backup
* Launch the application
* Configure it as required — for example, create default notes, install the necessary plugins, and adjust settings
* Once finished, the profile will contain all the required data and configuration
* Save this profile and use it when deploying the application to other machines
