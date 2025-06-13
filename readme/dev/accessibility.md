# Development: Accessibility

Joplin has a strong focus on accessibility. It's important to make sure that new pull requests and features keep Joplin accessible.

## Making new components accessible

When creating new components, it's important to make sure that they're accessible. How to do this varies a bit between desktop and mobile, but in general:
- [All focusable controls should have labels.](https://www.w3.org/WAI/WCAG22/Understanding/info-and-relationships) (Usually, these labels are provided by text inside the controls.)
- [Buttons should be at least 24px by 24px.](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)
- [The app should be keyboard-accessible](https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html).
- [The app should be usable from a screen reader](#testing-with-a-screen-reader)
- [Controls should have sufficient contrast](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
   - See [the WebAIM contrast checker](https://webaim.org/resources/contrastchecker/).

For a full list of accessibility guidelines, see [the WCAG 2.2](https://www.w3.org/TR/WCAG22/).

For more information, see:
- **Resources for HTML**:
	- [Providing Accessible Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/).
	- [Standard keyboard and ARIA for different component types](https://www.w3.org/WAI/ARIA/apg/patterns/).
	- [Developing a Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/).
- **Resources for React Native**:
	- React Native [lists accessibility-related properties in its documentation](https://reactnative.dev/docs/accessibility).

## Testing with a screen reader

Joplin should be accessible to [screen readers](https://en.wikipedia.org/wiki/Screen_reader). A big part of this is testing changes to the UI with a screen reader. Here's how to do that.

### Desktop: Setting up a screen reader

Most systems have a built-in screen reader that can be enabled and disabled in settings, or with keyboard shortcuts:
- **Windows**:
	- [Windows Narrator](https://www.microsoft.com/en-us/windows/tips/narrator) comes with Windows.
	- [NVDA](https://www.nvaccess.org/download/) is a popular OpenSource screen reader for Windows. It doesn't come with Windows and must be downloaded.
- **MacOS**:
	- [VoiceOver](https://support.apple.com/guide/voiceover/get-started-vo4be8816d70/mac) comes with MacOS.
- **Linux**:
	- Many Linux systems come with the [Orca](https://help.gnome.org/users/orca/stable/) screen reader. It's often possible to launch it from the command line by running `orca`.

Each of these screen readers has its own keyboard shortcuts and navigation methods. In general, however, it's possible to use keyboard shortcuts such as <kbd>tab</kbd> and <kbd>shift</kbd>-<kbd>tab</kbd> to navigate while a screen reader is enabled. See the documentation links above for documentation specific to each screen reader.

**Notes**:
- Joplin works best if the screen reader is started before launching the app.
- Screen readers usually have shortcuts for jumping to different parts of the page, including headings and [landmarks](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/general-principles.html). See [the ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/landmarks/examples/at.html) for a list of these shortcuts for different screen readers.
- Screen readers often have different **focus** and **browse** modes.
    - Focus mode is used, for example, when typing text in a text box. Keypresses are sent to the textbox rather than being interpreted as screen reader commands. 
    - In browse mode, keyboard shortcuts can be used to more quickly jump between different parts of the page. For example, in the Orca screen reader, pressing <kbd>b</kbd> jumps to the next button, but only in browse mode.
    - See also [NVDA browse and focus modes](https://download.nvaccess.org/documentation/userGuide.html#BrowseMode), [Orca: Filling out forms (discusses browse and focus modes)](https://help.gnome.org/users/orca/stable/howto_forms.html.en).

### Mobile: Setting up a screen reader

Like desktop, most physical Android and iOS devices come with screen readers. However, setting up a screen reader on an Android emulator or iOS simulator can be a bit more difficult:
- **Physical Android device**:
	- Android devices usually come with [TalkBack](https://support.google.com/accessibility/android/answer/6007100?hl%3Den#).
	- See `developer.android.com`'s [guide for testing with TalkBack](https://developer.android.com/guide/topics/ui/accessibility/testing#talkback).
- **Physical iOS device**:
	- iOS comes with [VoiceOver](https://support.apple.com/guide/iphone/turn-on-and-practice-voiceover-iph3e2e415f/ios).
- **iOS simulator**:
	1. Start the simulator.
	2. Enable [VoiceOver for MacOS](https://support.apple.com/guide/voiceover/get-started-vo4be8816d70/mac).
	3. Focus the simulator's window.
	4. Press <kbd>control</kbd>-<kbd>option</kbd>-<kbd>rightArrow</kbd> repeatedly to move VoiceOver focus into the simulator.
		- **Note**: Sometimes, VoiceOver reads "Simulator not responding" before allowing VoiceOver focus to be moved into the simulator.
- **Android emulator**:
	- On Android, it may be necessary to install TalkBack from the Google Play Store (in an emulator with the Play Store installed) or [build a TalkBack APK from source](https://github.com/google/talkback).
	- After installation, TalkBack can be enabled as on a physical Android device, from the settings app.
- **Web**:
	- Enable the operating system's screen reader (see "Desktop: Setting up a screen reader").

On a physical mobile device, VoiceOver and TalkBack share certain gestures:
- **To focus the next item**: Swipe from left to right.
- **To focus the previous item**: Swipe from right to left.
- **To jump focus to a particular part of the screen**: Tap once on the part of the screen to focus.
- **To click on the focused item**: Double-tap anywhere on the screen.

## Adding automated tests to prevent regressions

The desktop and mobile apps use different frameworks for checking for accessibility-related regressions: The desktop app uses [Playwright](https://playwright.dev/) and the mobile app uses [react-native-testing-library](https://callstack.github.io/react-native-testing-library/).

### Desktop: Automated accessibility testing

Existing Playwright automated tests can be found in `packages/app-desktop/integration-tests`. See the [integration-tests/README.md](https://github.com/laurent22/joplin/blob/dev/packages/app-desktop/integration-tests/README.md) file for details.

For general accessibility issues (e.g. contrast, missing labels), we use [`@axe-core/playwright`](https://www.npmjs.com/package/@axe-core/playwright). This library scans everything visible on the screen and returns a set of errors. See `integration-tests/wcag.spec.ts` for existing tests that make use of this library.

Keyboard interface tests should go in the other test files. For example, `richText.spec.ts` currently includes several tests related to using the editor with a keyboard. While writing these tests, the [expect.toBeFocused](https://playwright.dev/docs/api/class-locatorassertions#locator-assertions-to-be-focused), [keyboard.press](https://playwright.dev/docs/api/class-keyboard#keyboard-press), and [getByRole](https://playwright.dev/docs/api/class-frame#frame-get-by-role) APIs might be particularly useful.

The [getByRole](https://playwright.dev/docs/api/class-frame#frame-get-by-role) API can also be used to verify that components have specific [role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles) information.

### Mobile: Automated accessibility testing

On mobile, [react-native-testing-library](https://callstack.github.io/react-native-testing-library/) also provides a [getByRole](https://callstack.github.io/react-native-testing-library/docs/api/queries#by-role) selector that can be used to ensure that accessibility information is present. See, for example, [this test for list of installed plugins](https://github.com/laurent22/joplin/blob/bf58a52394947acc42f8ca527b3ce22464d989c3/packages/app-mobile/components/screens/ConfigScreen/plugins/PluginStates.installed.test.tsx#L231).
