# Android Home Screen Quick-Actions Widget — Design

Date: 2026-09-10
Status: Approved design, pending implementation plan

## Summary

Add an Android home screen widget for the Joplin mobile app that provides one-tap access to the same five quick actions exposed by the app icon's long-press menu: New note, New to-do, New photo, New attachment, and New drawing. The widget is horizontally resizable from 1 to 5 launcher columns, and a configuration screen shown when the widget is added lets the user choose which actions appear and in what order.

## Requirements

- Widget displays a horizontal row of action buttons: note, to-do, photo, attachment, drawing.
- Horizontally resizable, 1 to 5 launcher columns; fixed height of one row.
- When the widget is added, the launcher opens a configuration screen where the user selects a non-empty ordered subset of the five actions. The order is free — the user chooses the left-to-right sequence.
- Multiple widget instances may coexist with independent configurations.
- The widget can be reconfigured later (long-press → Reconfigure on Android 12+).
- Tapping a button behaves exactly like the corresponding app-icon long-press shortcut, warm or cold start.
- UI text is localized through the existing Joplin translation pipeline.

## Background

The long-press quick actions are implemented in `packages/app-mobile/setupQuickActions.ts` via `react-native-quick-actions` (`jordanbyron/react-native-quick-actions`). On Android, that library:

- Registers dynamic shortcuts whose intents target `MainActivity` with action string `ACTION_SHORTCUT` and a `PersistableBundle` extra `SHORTCUT_ITEM` containing keys `type`, `title`, `icon`, and `userInfo` (an inner bundle with at least a `url` key).
- On warm start, an `ActivityEventListener` receives `onNewIntent` and emits the `quickActionShortcut` JS event.
- On cold start, `QuickActions.popInitialAction()` (called from `root.tsx` startup) reads the launch intent and returns the item.

`MainActivity` uses `launchMode="singleTask"`, so a PendingIntent targeting it with the shortcut intent format reaches one of those two existing paths. The existing handler in `setupQuickActions.ts` maps `type` to the `newNote` command with the right options (`isTodo`, `attachFileAction`). The widget reuses this path unchanged — no JS changes are needed for tap handling.

No widget infrastructure currently exists in the app. Native code lives under `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/`, with existing native-module patterns in `SharePackage`, `SslPackage`, and `SystemInformationPackage`. The app entry point is `packages/app-mobile/index.js` (`registerRootComponent(Root)`, which registers the `'main'` component). There is no React Native drag-and-drop library available; `react-native-gesture-handler` is installed. `minSdkVersion` is 24, `compile/targetSdkVersion` 36.

## Architecture

Approach: native widget rendered with RemoteViews, plus a React Native configuration activity (its own `AppRegistry` entry) declared as the widget's configure activity.

Rationale: the widget is static buttons, where plain RemoteViews are the most robust and cheapest option. Configuration needs Joplin theming and translations, which only the RN side can provide cheaply, so it lives in a second React activity. Ordering is captured with a tap-to-add builder rather than drag-and-drop, avoiding a new dependency and gesture complexity.

## Components

### Native — `net.cozic.joplin.widget.JoplinQuickActionsWidgetProvider`

An `AppWidgetProvider` that renders the widget from saved configuration:

- Layout `res/layout/widget_quick_actions.xml` contains five pre-declared button slots (RemoteViews cannot create views dynamically). Each slot is a weighted `LinearLayout` cell containing an `ImageView` (icon) and a `TextView` (label). Unselected slots are set to `GONE`; visible slots divide the row evenly at any widget width. Column count affects total width only, never which buttons are shown.
- Each button's `PendingIntent` targets `MainActivity` with `action="ACTION_SHORTCUT"` and a `SHORTCUT_ITEM` `PersistableBundle` (`type`, `title`, `icon`, `userInfo: {url: ''}`) — the exact intent contract `react-native-quick-actions` produces. This intentionally duplicates the library's private intent format; a comment must reference `AppShortcutsModule.java` in `jordanbyron/react-native-quick-actions` per the repo's duplication guidelines.
- `onAppWidgetOptionsChanged` reads `OPTION_APPWIDGET_MIN_WIDTH` (and max width): below 180dp, labels are hidden (icons only); at or above, labels are shown.
- `onDeleted` removes that widget's preferences entry.
- Provider logic (config load, slot mapping, RemoteViews construction) lives in a plain Kotlin class with no Android framework dependencies beyond `RemoteViews`/`Context`, kept testable; the provider class is a thin shell.

### Native — `res/xml/joplin_quick_actions_widget_info.xml`

`appwidget-provider` attributes: `targetCellWidth="5"`, `targetCellHeight="1"`, `maxResizeWidth` of 5 cells, `minResizeWidth` of 1 cell, dp-based `minWidth`/`minResizeWidth`/`maxResizeWidth` fallbacks for API 24–30, `resizeMode="horizontal"`, `widgetFeatures="reconfigurable"`, `android:configure` pointing at the config activity, `initialLayout` set to the widget layout.

### Native — `WidgetConfigActivity`

A second `ReactActivity` (`getMainComponentName() == "widgetConfig"`), launched by the launcher with `EXTRA_APPWIDGET_ID`, `android:exported="false"`. Backing out finishes with the default `RESULT_CANCELED`, which cancels the widget add (standard configure-activity contract). It rides the shared `ReactNativeHost` from `MainApplication`.

### Native — `WidgetManager` module

A native module following the `SharePackage` pattern. Single method: `saveConfig(appWidgetId, orderedItems)` where `orderedItems` is an array of `{type, title}` pairs (icons are mapped to drawables natively by type). It persists the configuration as JSON in `SharedPreferences` keyed by `appWidgetId`, pushes the updated `RemoteViews` through `AppWidgetManager`, and finishes the config activity with `RESULT_OK`. A `getConfigInfo()` method returns the current `appWidgetId` and saved items (`null` items on fresh creation, so the screen starts empty; saved items on reconfigure, pre-filling the selection).

### Native — manifest

- `<receiver>` for the provider with `APPWIDGET_UPDATE` intent filter and `META_DATA_APPWIDGET_PROVIDER` metadata.
- `<activity android:name=".widget.WidgetConfigActivity" android:exported="true">` with an `android.appwidget.action.APPWIDGET_CONFIGURE` intent filter — the launcher (not the app) launches it, so it must be exported — and a standard full-screen activity theme (a dialog-like theme may be a follow-up polish item, but ReactActivity + dialog themes carry known edge cases, so the initial implementation uses the standard theme).

### Native — resources

- Five Material-style vector drawables for the actions (note, to-do, photo, attachment, drawing), tinted via day/night color resources.
- Rounded-rect widget background drawable with day/night variants.

### JS — entry registration

`packages/app-mobile/index.js` gains one registration: `AppRegistry.registerComponent('widgetConfig', () => WidgetConfigScreen)`.

### JS — `components/WidgetConfig/`

A self-contained configuration screen with no redux dependency (theme provider + locale initialization only, mirroring other standalone screens):

- List of the five available actions, localized via `_()` with icons from the existing icon font.
- Tap-to-add ordering: tapping an available action appends it to the selected sequence; the selected list shows numbered order and tapping a selected item removes it; a live preview row mirrors the final widget.
- Save is disabled while the selection is empty. Save calls the native `saveConfig` with the ordered `{type, title}` pairs. Titles are the localized strings at save time, stored for RemoteViews use — native `strings.xml` is not fed by Joplin's Crowdin pipeline, so labels must originate in JS.

## Data flow

- **Creation**: launcher → config activity (`EXTRA_APPWIDGET_ID`) → user builds ordered selection → Save → `saveConfig` persists prefs, updates RemoteViews, `RESULT_OK` → widget visible.
- **Tap, warm**: button PendingIntent → `MainActivity` (`singleTask`) → `onNewIntent` → library emits `quickActionShortcut` → existing `setupQuickActions.ts` handler runs the `newNote` command with appropriate options.
- **Tap, cold**: PendingIntent becomes the launch intent → app boots → `popInitialAction()` reads it → same handler. Identical to shortcut cold start today.
- **Resize**: launcher → `onAppWidgetOptionsChanged` → re-read prefs, rebuild RemoteViews, toggle label visibility by width.
- **Reconfigure**: launcher "Reconfigure" (API 31+) or delete-and-re-add → config screen pre-filled from prefs.

## Edge cases and error handling

- **Missing or corrupt prefs**: provider falls back to all five actions in canonical order, icons only. The widget never renders empty.
- **Locale changed after configuration**: stored labels remain in the language saved at config time until reconfigured. Accepted trade-off; behavior (types, routing) is unaffected.
- **Multiple instances**: preferences keyed per `appWidgetId`; independent lifecycle; cleanup in `onDeleted`.
- **Config activity abandoned** (back-out, process death): nothing persisted, default `RESULT_CANCELED`, launcher cancels the add. No orphaned state.
- **API 24–30**: `targetCellWidth`, `widgetFeatures` ignored (harmless); sizing uses dp fallbacks; reconfigure requires delete-and-re-add. PendingIntents use `FLAG_IMMUTABLE` (required from API 31).
- **Quick-actions availability**: widget intents bypass the `QuickActions.setShortcutItems` support guard, but all five types map to `newNote` command variants that exist on every supported build; no extra guard needed.

## Testing

- **Kotlin unit tests**: prefs round-trip preserves ordered types; fallback to defaults on corrupt/missing JSON; cleanup on delete; RemoteViews construction yields the right number of visible slots with correct labels/icons per type.
- **JS Jest tests**: ordered selection by tap sequence; removal from the middle reorders correctly; Save payload matches the exact ordered array; Save disabled when empty; preview mirrors selection.
- **Manual QA**: add at 1×1 and 5×1; resize across the range; warm/cold taps for all five actions; multiple instances with distinct configs; reconfigure; dark mode; RTL layout; behavior on API 24–30 emulator.

## Out of scope

- iOS widgets or lock-screen/compound widgets.
- Drag-and-drop reordering in the config screen (tap-to-add covers ordering; drag can be added later).
- Dynamic widget content (note previews, todo lists).
- Widget UI refresh on locale change without reconfiguration.

## Deliverables checklist

- `JoplinQuickActionsWidgetProvider` + layout + provider-info XML + icons/backgrounds
- `WidgetConfigActivity` + manifest registration
- `WidgetManager` module (`saveConfig`)
- JS config screen + `index.js` registration
- Kotlin unit tests, JS Jest tests
- `yarn updateIgnored` run for any new TypeScript files
