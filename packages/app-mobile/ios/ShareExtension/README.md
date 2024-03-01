# Share Extension Creation Instructions
## Creating the Target
2. In Xcode select File->New->Target
3. Then search for Share Extension
4. Select Share Extension and click Next
5. In Product Name enter ShareExtension
6. Leave the rest of the options and click Finish
7. If the Activate "ShareExtension" scheme popup comes, click Activate

## Configuring the Share Extension
1. Delete *ShareViewController.h* and *ShareViewController.m* from the project. (Select files and right click, then Delete)
2. On the confirmation popup, select Move to Trash
3. Now add *ShareViewController.h* and *ShareViewController.m* from *ShareExtension/Source/ShareExtension*. This can be done by right clicking on the *ShareExtension* folder in Xcode and selecting Add Files to "Joplin". Double check that the ShareExtension is checked for Add to targets and click Add.
4. Switch over to git and reset the changes done to *ShareExtension/Base.lproj/Maininterface.storyboard* and *ShareExtension/Info.plist*, as Xcode generated new versions of these files and overwrote ours.
5. Now select the ShareExtension Target and go to Signing & Capabilities
6. Click the + Capability and search for App Groups and add it
7. Back in git reset *ShareExtension/ShareExtension.entitlements* as Xcode just overwrote it. Back in Xcode you should see the app group set
8. Now switch to General, just left of Signing & Capabilities
9. Under Deployment Info, change the iOS version to match the Joplin target version, which is 9.0

## Configuring Joplin
1. We need to perform the same steps to add the App Group as done for the Share Extension, the only difference is the entitlements files is *Joplin.entitlements*

## Final Steps
1. Run pod install from the ios directory to install the new pods

# Other Information
## App Group
If the app group name needs to be changed for some reason, it needs to be changed for both the Share Extension and Joplin. Also *ShareExtensionGroupIdentifier* in *ShareExtension/Source/Common/ShareExtensionConstants.m* needs to be changed to match the new app group.