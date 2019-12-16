# GSoC: Support for multiple profiles

The applications should support multiple profiles so that, for example, one can have a "work" profile and "personal" profile. This will also make it easier to share notes because for example a "work project" profile could be created and share with co-workers.

## Specification

Provide a way to switch profiles from the app:

- The user clicks on a menu and select change profile
- The list of available profiles is displayed
- User selects on of the profile
- The app closes and re-open and load the selected profile

### Changing the structure of the profile directory

The structure of the profile directory needs to be changed for this to work.

Currently, the profile is organised like this:

* ~/.config/joplin-desktop/
	* resources/
	* database.sqlite

If we want to support multiple profiles, the config directory should be changed like so (in a way similar to Firefox or Thunderbird multi-profile support):

* ~/.config/joplin-desktop/
	* PROFILE_ID_1/
	* PROFILE_ID_2/
	* etc.
	* profile.ini

The PROFILE_ID_x directories will be named with a UUID and contain the same profile as above with the "resources" and "database.sqlite" file.

`profile.ini` will tell what profiles are available. It's content will be like this (same as Firefox):

```ini
[Profile1]
Name=Personal
IsRelative=1
Path=cdb4ar19.Personal

[Profile0]
Name=default
IsRelative=1
Path=Profiles/ts6eud8o.default
Default=1

[Profile2]
Name=Work
IsRelative=1
Path=Profiles/ts9akd8o.work

[General]
StartWithLastProfile=1
Version=1
```

Since the profile directory is changed, there should be a migration step that will convert old profiles to the new structure when the app starts.

### Switching profiles

To switch profile, save a value to the Settings called "next_profile_id", then close and restart the app. When the app starts it loads "profile.ini", then checks the value of "next_profile_id", and uses that to choose and load the right profile.

### Locking per profile

Each app needs to make sure that a given profile can only be open by one application, so there should be form of lock. If a profile is locked, it means it's already opened by another application, so the current application should close.

Locking should be implemented in such a way that if an app crashes, the lock is released. So probably some form of in-memory lock.

### Desktop implementation

To restart the app use the built-in Electron function: https://electronjs.org/docs/api/app#apprelaunchoptions

### Mobile implementation

On mobile, give a try to this package to restart the app: https://www.npmjs.com/package/react-native-restart

## See also

- Forum thread: https://discourse.joplinapp.org/t/can-i-run-a-second-instance-of-joplin/110
- GitHub issue: https://github.com/laurent22/joplin/issues/591
