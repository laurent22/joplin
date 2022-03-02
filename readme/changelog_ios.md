# Joplin iOS app changelog

## [ios-v12.7.1](https://github.com/laurent22/joplin/releases/tag/ios-v12.7.1) - 2022-02-14T14:10:49Z

- New: Add additional time format HH.mm (#6086 by [@vincentjocodes](https://github.com/vincentjocodes))
- Improved: Do no duplicate resources when duplicating a note (721d008)
- Improved: Make heading 4, 5 and 6 styling more consistent (fca5875)
- Improved: Show login prompt for OneDrive (#5933 by Jonathan Heard)
- Improved: Update Mermaid 8.13.5 -&gt; 8.13.9 and Katex dependencies (#6039 by Helmut K. C. Tessarek)
- Fixed: Fixed issue where synchroniser would try to update a shared folder that is not longer accessible (667d642)
- Fixed: Prevent multiline note titles (#6144) (#5482 by [@Daeraxa](https://github.com/Daeraxa))
- Fixed: Shared resource was not encrypted with correct encryption key (#6092)

## [ios-v12.6.2](https://github.com/laurent22/joplin/releases/tag/ios-v12.6.2) - 2021-12-17T09:59:16Z

- New: Add date format YYYY/MM/DD (#5759 by Helmut K. C. Tessarek)
- New: Add support for faster built-in sync locks (#5662)
- New: Add support for sharing notes when E2EE is enabled (#5529)
- New: Added support for notebook icons (e97bb78)
- Improved: Also duplicate resources when duplicating a note (c0a8c33)
- Improved: Improved S3 sync error handling and reliability, and upgraded S3 SDK (#5312 by Lee Matos)
- Improved: Improved error message when synchronising with Joplin Server (#5754)
- Improved: Ping joplinapp.org domain instead of Google when doing the WiFi connection check (#5705)
- Improved: Set min supported iOS version to 13.0 (298e85f)
- Improved: Update Mermaid: 8.12.1 -&gt; 8.13.5 (#5831 by Helmut K. C. Tessarek)
- Improved: Upgraded React Native from 0.64 to 0.66 (66e79cc)
- Fixed: Alarm setting buttons were no longer visible (#5777)
- Fixed: Fixed "Invalid lock client type" error when migrating sync target (e0e93c4)
- Fixed: Fixed iOS 12 crash that prevents the app from starting (#5671)
- Fixed: Fixed issue that could cause application to needlessly lock the sync target (0de6e9e)
- Fixed: Fixed issue with parts of HTML notes not being displayed in some cases (#5687)
- Fixed: Handle duplicate attachments when the parent notebook is shared (#5796)
- Fixed: Links in flowchart Mermaid diagrams (#5830) (#5801 by Helmut K. C. Tessarek)
- Fixed: Sharing multiple notebooks via Joplin Server with the same user results in an error (#5721)
