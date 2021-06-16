# Joplin Android app changelog

## [android-v2.0.4](https://github.com/laurent22/joplin/releases/tag/android-v2.0.4) - 2021-06-16T12:15:56Z

- Improved: Prevent sync process from being stuck when the download state of a resource is invalid (5c6fd93)

## [android-v2.0.3](https://github.com/laurent22/joplin/releases/tag/android-v2.0.3) (Pre-release) - 2021-06-16T09:48:58Z

- Improved: Verbose mode for synchronizer (4bbb3d1)

## [android-v2.0.2](https://github.com/laurent22/joplin/releases/tag/android-v2.0.2) - 2021-06-15T20:03:21Z

- Improved: Conflict notes will now populate a new field with the ID of the conflict note. (#5049 by [@Ahmad45123](https://github.com/Ahmad45123))
- Improved: Filter out form elements from note body to prevent potential XSS (thanks to Dmytro Vdovychinskiy for the PoC) (feaecf7)
- Improved: Focus note editor where tapped instead of scrolling to the end (#4998) (#4216 by Roman Musin)
- Improved: Improve search with Asian scripts (#5018) (#4613 by [@mablin7](https://github.com/mablin7))
- Fixed: Fixed and improved alarm notifications (#4984) (#4912 by Roman Musin)
- Fixed: Fixed opening URLs that contain non-alphabetical characters (#4494)
- Fixed: Fixed user content URLs when sharing note via Joplin Server (2cf7067)
- Fixed: Inline Katex gets broken when editing in Rich Text editor (#5052) (#5025 by [@Subhra264](https://github.com/Subhra264))
- Fixed: Items are filtered in the API search (#5017) (#5007 by [@JackGruber](https://github.com/JackGruber))
- Fixed: Wrong field removed in API search (#5066 by [@JackGruber](https://github.com/JackGruber))
