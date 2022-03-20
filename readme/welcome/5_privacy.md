# Joplin Privacy Policy

The Joplin applications, including the Android, iOS, Windows, macOS and Linux applications, do not send any data to any service without your authorisation. Any data that Joplin saves, such as notes or images, are saved to your own device and you are free to delete this data at any time.

If you choose to synchronise with a third-party, such as OneDrive or Dropbox, the notes will be sent to that account, in which case the third-party privacy policy applies.

In order to provide certain features, Joplin may need to connect to third-party services. You can disable most of these features in the application settings:

| Feature  | Description   | Default  | Can be disabled |
| -------- | ------------- | -------- | --- |
| Auto-update | Joplin periodically connects to GitHub to check for new releases. | Enabled | Yes |
| Geo-location | Joplin saves geo-location information in note properties when you create a note. | Enabled | Yes |
| Synchronisation | Joplin supports synchronisation of your notes across multiple devices. If you choose to synchronise with a third-party, such as OneDrive, the notes will be sent to your OneDrive account, in which case the third-party privacy policy applies. | Disabled | Yes |
| Wifi connection check | On mobile, Joplin checks for Wifi connectivity to give the option to synchronise data only when Wifi is enabled. | Enabled | No <sup>(1)</sup> |
| Spellchecker dictionary | On Linux and Windows, the desktop application downloads the spellchecker dictionary from `redirector.gvt1.com`. | Enabled | Yes <sup>(2)</sup> |
| Plugin repository | The desktop application downloads the list of available plugins from the [official GitHub repository](https://github.com/joplin/plugins). If this repository is not accessible (eg. in China) the app will try to get the plugin list from [various mirrors](https://github.com/laurent22/joplin/blob/8ac6017c02017b6efd59f5fcab7e0b07f8d44164/packages/lib/services/plugins/RepositoryApi.ts#L22), in which case the plugin screen [works slightly differently](https://github.com/laurent22/joplin/issues/5161#issuecomment-925226975). | Enabled | No

<sup>(1) https://github.com/laurent22/joplin/issues/5705</sup><br/>
<sup>(2) If the spellchecker is disabled, [it will not download the dictionary](https://discourse.joplinapp.org/t/new-version-of-joplin-contacting-google-servers-on-startup/23000/40?u=laurent).</sup>

For any question about Joplin privacy policy, please leave a message [on the forum](https://discourse.joplinapp.org/).
