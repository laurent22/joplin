# About End-To-End Encryption (E2EE)

End-to-end encryption (E2EE) is a system where only the owner of the data (i.e. notes, notebooks, tags or resources) can read it. It prevents potential eavesdroppers - including telecom providers, internet providers, and even the developers of Joplin from being able to access the data.

The system is designed to defeat any attempts at surveillance or tampering because no third party can decipher the data being communicated or stored.

There is a small overhead to using E2EE since data constantly has to be encrypted and decrypted so consider whether you really need the feature.

# Enabling E2EE

Due to the decentralised nature of Joplin, E2EE needs to be manually enabled on a single device first (this will create a Master Key for encryption secured by your password) and then it must be synced with all other remaining devices. It is recommended to start with the desktop or terminal application since they generally run on more powerful devices (unlike the mobile application), and so they can encrypt the initial data faster.

To enable it, please follow these steps:

1. On your first device (eg. on the desktop application), go to the Encryption Config screen and click "Enable encryption"
2. Input your password. This is the Master Key password which will be used to encrypt all your notes. Make sure you do not forget it since, for security reason, it cannot be recovered.
3. Now you need to synchronise all your notes so that they are sent encrypted to the sync target (eg. to OneDrive, Nextcloud, etc.). Wait for any synchronisation that might be in progress and click on "Synchronise".
4. Wait for this synchronisation operation to complete. Since all the data needs to be re-sent (encrypted) to the sync target, it may take a long time, especially if you have many notes and resources. Note that even if synchronisation seems stuck, most likely it is still running - do not cancel it and simply let it run over night if needed.
5. Once this first synchronisation operation is done, open the next device you are synchronising with. Click "Synchronise" and wait for the sync operation to complete. The device will receive the master key, and you will need to provide the password for it. At this point E2EE will be automatically enabled on this device. Once done, click Synchronise again and wait for it to complete.
6. Repeat step 5 for each device.

Do not manually enable encryption on multiple devices in parallel, but rather wait for the other ones to sync with the first already encrypted device. Otherwise, you may end up with multiple encryption keys (which is supported by Joplin but most probably not what you want).

Once all the devices are in sync with E2EE enabled, the encryption/decryption should be mostly transparent. Occasionally you may see encrypted items but they will get decrypted in the background eventually.

# Disabling E2EE

Follow the same procedure as above but instead disable E2EE on each device one by one. Again it might be simpler to do it one device at a time and to wait every time for the synchronisation to complete.

# Technical specification

For a more technical description, mostly relevant for development or to review the method being used, please see the [Encryption specification](https://joplinapp.org/spec/e2ee/).
