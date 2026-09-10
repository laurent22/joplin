# Android Quick-Actions Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a horizontally resizable (1–5 columns) Android home-screen widget whose buttons trigger Joplin's five quick actions, configurable at creation time (which actions, which order).

**Architecture:** Native `AppWidgetProvider` renders static buttons via `RemoteViews` from per-widget config persisted in `SharedPreferences`. Button taps send PendingIntents in the exact format `react-native-quick-actions` produces, so the existing `quickActionShortcut` handling in `setupQuickActions.ts` works unchanged. A second React entry (`widgetConfig`, hosted by `WidgetConfigActivity`) provides the Joplin-themed configuration UI and persists through a small `JoplinWidget` native module.

**Tech Stack:** Kotlin + RemoteViews (Android), React Native 0.81.6 + react-native-paper (config screen), Jest (JS tests), JUnit 4 (Kotlin tests).

**Spec:** `docs/superpowers/specs/2026-09-10-android-quick-actions-widget-design.md`

## Global Constraints

- Tabs for indentation, single quotes for strings, no JSDoc — `//` comments only, and only when non-obvious.
- Don't annotate return types/const types when TypeScript can infer them. Annotate only when inference yields `any`.
- One `describe()` per Jest test file; use `test.each` for similar cases; avoid test-code duplication.
- Run `yarn updateIgnored` from the repo root when adding TypeScript files.
- Commit messages use the repo's area prefixes, e.g. `Mobile: Add quick actions widget provider`.
- `minSdkVersion` 24, `compile/targetSdkVersion` 36 (from `packages/app-mobile/android/build.gradle`).
- The quick-action intent contract is `action="ACTION_SHORTCUT"` + `PersistableBundle` extra `"SHORTCUT_ITEM"` with keys `type`, `title`, `icon`, `userInfo` (inner bundle with `url`). It must match `AppShortcutsModule.java` in `jordanbyron/react-native-quick-actions` (v0.3.13); any intentional duplication of this contract carries a comment referencing that file.
- Locale strings "New note", "New to-do", "New photo", "New attachment", "New drawing" already exist in `packages/app-mobile/locales/*.json` — do not add new locale strings.
- All shell commands run from the repo root (`/home/ross/joplin/joplin`) unless stated otherwise. Gradle commands need an Android SDK (`ANDROID_HOME` set).

---

### Task 1: Kotlin config persistence (codec + defaults) with unit tests

**Files:**
- Create: `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetAction.kt`
- Create: `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetConfigCodec.kt`
- Create: `packages/app-mobile/android/app/src/test/java/net/cozic/joplin/widget/WidgetConfigCodecTest.kt`
- Modify: `packages/app-mobile/android/app/build.gradle` (dependencies block)

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `data class WidgetAction(val type: String, val title: String)`; `object WidgetConfigCodec { fun serialize(actions: List<WidgetAction>): String; fun deserialize(json: String?): List<WidgetAction> }`; `object DefaultWidgetActions { val all: List<WidgetAction> }` (five actions in canonical order). Used by Tasks 2–4.

- [ ] **Step 1: Add JUnit + org.json test dependencies**

In `packages/app-mobile/android/app/build.gradle`, the `dependencies` block currently reads:

```gradle
dependencies {
    // The version of react-native is set by the React Native Gradle Plugin
    implementation("com.facebook.react:react-android")
    implementation("com.facebook.react:hermes-android")
}
```

Change it to:

```gradle
dependencies {
    // The version of react-native is set by the React Native Gradle Plugin
    implementation("com.facebook.react:react-android")
    implementation("com.facebook.react:hermes-android")
    testImplementation("junit:junit:4.13.2")
    // The android.jar org.json classes throw "not mocked" in JVM unit tests;
    // the standalone org.json artifact provides a real implementation.
    testImplementation("org.json:json:20240303")
}
```

- [ ] **Step 2: Write the failing test**

Create `packages/app-mobile/android/app/src/test/java/net/cozic/joplin/widget/WidgetConfigCodecTest.kt`:

```kotlin
package net.cozic.joplin.widget

import org.junit.Assert.assertEquals
import org.junit.Test

class WidgetConfigCodecTest {
	@Test
	fun roundTripsAnOrderedConfig() {
		val actions = listOf(
			WidgetAction("newPhoto", "New photo"),
			WidgetAction("newNote", "New note"),
		)
		assertEquals(actions, WidgetConfigCodec.deserialize(WidgetConfigCodec.serialize(actions)))
	}

	@Test
	fun fallsBackToDefaultsWhenConfigIsMissing() {
		assertEquals(DefaultWidgetActions.all, WidgetConfigCodec.deserialize(null))
	}

	@Test
	fun fallsBackToDefaultsOnCorruptJson() {
		assertEquals(DefaultWidgetActions.all, WidgetConfigCodec.deserialize("not json"))
	}

	@Test
	fun fallsBackToDefaultsOnEmptyConfig() {
		assertEquals(DefaultWidgetActions.all, WidgetConfigCodec.deserialize("[]"))
	}

	@Test
	fun defaultsContainAllFiveActionsInCanonicalOrder() {
		assertEquals(
			listOf("newNote", "newTodo", "newPhoto", "newResource", "newDrawing"),
			DefaultWidgetActions.all.map { it.type },
		)
	}
}
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd packages/app-mobile/android && ./gradlew :app:testDebugUnitTest`
Expected: compile FAILURE — `WidgetAction` / `WidgetConfigCodec` unresolved. (First gradle run may download dependencies; be patient.)

- [ ] **Step 4: Write the implementation**

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetAction.kt`:

```kotlin
package net.cozic.joplin.widget

data class WidgetAction(val type: String, val title: String)

object DefaultWidgetActions {
	val all: List<WidgetAction> = listOf(
		WidgetAction("newNote", "New note"),
		WidgetAction("newTodo", "New to-do"),
		WidgetAction("newPhoto", "New photo"),
		WidgetAction("newResource", "New attachment"),
		WidgetAction("newDrawing", "New drawing"),
	)
}
```

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetConfigCodec.kt`:

```kotlin
package net.cozic.joplin.widget

import org.json.JSONArray
import org.json.JSONException
import org.json.JSONObject

object WidgetConfigCodec {
	fun serialize(actions: List<WidgetAction>): String {
		val array = JSONArray()
		for (action in actions) {
			array.put(JSONObject().put("type", action.type).put("title", action.title))
		}
		return array.toString()
	}

	fun deserialize(json: String?): List<WidgetAction> {
		if (json == null) return DefaultWidgetActions.all
		return try {
			val array = JSONArray(json)
			val actions = mutableListOf<WidgetAction>()
			for (i in 0 until array.length()) {
				val obj = array.getJSONObject(i)
				actions.add(WidgetAction(obj.getString("type"), obj.getString("title")))
			}
			actions.ifEmpty { DefaultWidgetActions.all }
		} catch (error: JSONException) {
			DefaultWidgetActions.all
		}
	}
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd packages/app-mobile/android && ./gradlew :app:testDebugUnitTest`
Expected: PASS — `WidgetConfigCodecTest` green (5 tests).

- [ ] **Step 6: Commit**

```bash
git add packages/app-mobile/android/app/build.gradle packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetAction.kt packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetConfigCodec.kt packages/app-mobile/android/app/src/test/java/net/cozic/joplin/widget/WidgetConfigCodecTest.kt
git commit -m "Mobile: Add widget config codec with unit tests"
```

---

### Task 2: Slot mapping logic with unit tests

**Files:**
- Create: `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetSlotMapper.kt`
- Create: `packages/app-mobile/android/app/src/test/java/net/cozic/joplin/widget/WidgetSlotMapperTest.kt`

**Interfaces:**
- Consumes: `WidgetAction` from Task 1.
- Produces: `data class WidgetSlot(val slotIndex: Int, val action: WidgetAction?, val labelVisible: Boolean)` (index 0–4, `null` action = slot hidden); `object WidgetSlotMapper { const val SLOT_COUNT = 5; fun slotsFor(actions: List<WidgetAction>, showLabels: Boolean): List<WidgetSlot> }`. Used by Task 3.

- [ ] **Step 1: Write the failing test**

Create `packages/app-mobile/android/app/src/test/java/net/cozic/joplin/widget/WidgetSlotMapperTest.kt`:

```kotlin
package net.cozic.joplin.widget

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class WidgetSlotMapperTest {
	@Test
	fun mapsSelectedActionsToSlotsInOrderAndHidesTheRest() {
		val actions = listOf(
			WidgetAction("newPhoto", "New photo"),
			WidgetAction("newNote", "New note"),
		)
		val slots = WidgetSlotMapper.slotsFor(actions, showLabels = true)

		assertEquals(WidgetSlotMapper.SLOT_COUNT, slots.size)
		assertEquals("newPhoto", slots[0].action?.type)
		assertEquals("newNote", slots[1].action?.type)
		assertNull(slots[2].action)
		assertNull(slots[3].action)
		assertNull(slots[4].action)
	}

	@Test
	fun emptySelectionHidesAllSlots() {
		val slots = WidgetSlotMapper.slotsFor(emptyList(), showLabels = false)
		assertEquals(WidgetSlotMapper.SLOT_COUNT, slots.count { it.action == null })
	}

	@Test
	fun propagatesLabelVisibilityToEverySlot() {
		val shown = WidgetSlotMapper.slotsFor(listOf(WidgetAction("newNote", "New note")), true)
		val hidden = WidgetSlotMapper.slotsFor(listOf(WidgetAction("newNote", "New note")), false)
		assertEquals(listOf(true, true, true, true, true), shown.map { it.labelVisible })
		assertEquals(listOf(false, false, false, false, false), hidden.map { it.labelVisible })
	}

	@Test
	fun moreActionsThanSlotsAreTruncated() {
		val actions = (1..7).map { WidgetAction("type$it", "Title $it") }
		val slots = WidgetSlotMapper.slotsFor(actions, showLabels = true)
		assertEquals(WidgetSlotMapper.SLOT_COUNT, slots.size)
		assertEquals("type5", slots[4].action?.type)
	}
}
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/app-mobile/android && ./gradlew :app:testDebugUnitTest`
Expected: compile FAILURE — `WidgetSlotMapper` unresolved.

- [ ] **Step 3: Write the implementation**

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetSlotMapper.kt`:

```kotlin
package net.cozic.joplin.widget

data class WidgetSlot(val slotIndex: Int, val action: WidgetAction?, val labelVisible: Boolean)

object WidgetSlotMapper {
	const val SLOT_COUNT = 5

	fun slotsFor(actions: List<WidgetAction>, showLabels: Boolean): List<WidgetSlot> {
		val selected = actions.take(SLOT_COUNT)
		return (0 until SLOT_COUNT).map { index ->
			WidgetSlot(index, selected.getOrNull(index), showLabels)
		}
	}
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd packages/app-mobile/android && ./gradlew :app:testDebugUnitTest`
Expected: PASS — `WidgetSlotMapperTest` (4 tests) and `WidgetConfigCodecTest` (5 tests) both green.

- [ ] **Step 5: Commit**

```bash
git add packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetSlotMapper.kt packages/app-mobile/android/app/src/test/java/net/cozic/joplin/widget/WidgetSlotMapperTest.kt
git commit -m "Mobile: Add widget slot mapper with unit tests"
```

---

### Task 3: Widget resources, views builder, provider, manifest registration

**Files:**
- Create: `packages/app-mobile/android/app/src/main/res/layout/widget_quick_actions.xml`
- Create: `packages/app-mobile/android/app/src/main/res/xml/joplin_quick_actions_widget_info.xml`
- Create: `packages/app-mobile/android/app/src/main/res/drawable/ic_widget_new_note.xml`, `ic_widget_new_todo.xml`, `ic_widget_new_photo.xml`, `ic_widget_new_attachment.xml`, `ic_widget_new_drawing.xml`, `widget_background.xml`
- Create: `packages/app-mobile/android/app/src/main/res/drawable-night/widget_background.xml`
- Create: `packages/app-mobile/android/app/src/main/res/values/widget_colors.xml`, `packages/app-mobile/android/app/src/main/res/values-night/widget_colors.xml`
- Modify: `packages/app-mobile/android/app/src/main/res/values/strings.xml` (add one string)
- Create: `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetConfigStore.kt`, `WidgetIcons.kt`, `WidgetViewsBuilder.kt`, `WidgetRefresher.kt`, `JoplinQuickActionsWidgetProvider.kt`
- Modify: `packages/app-mobile/android/app/src/main/AndroidManifest.xml` (add receiver)

**Interfaces:**
- Consumes: `WidgetAction`, `DefaultWidgetActions`, `WidgetConfigCodec` (Task 1); `WidgetSlot`, `WidgetSlotMapper` (Task 2).
- Produces: `class WidgetConfigStore(context: Context)` with `fun load(appWidgetId: Int): List<WidgetAction>`, `fun has(appWidgetId: Int): Boolean`, `fun save(appWidgetId: Int, actions: List<WidgetAction>)`, `fun clear(appWidgetId: Int)`; `object WidgetRefresher { fun refresh(context: Context, appWidgetId: Int) }`; provider class in the manifest. Used by Task 4.

- [ ] **Step 1: Create the icon drawables**

Create `packages/app-mobile/android/app/src/main/res/drawable/ic_widget_new_note.xml`:

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
	android:width="24dp"
	android:height="24dp"
	android:viewportWidth="24"
	android:viewportHeight="24">
	<path
		android:fillColor="@color/widget_icon_tint"
		android:pathData="M3,17.25V21h3.75L17.81,9.94l-3.75,-3.75L3,17.25zM20.71,7.04c0.39,-0.39 0.39,-1.02 0,-1.41l-2.34,-2.34c-0.39,-0.39 -1.02,-0.39 -1.41,0l-1.83,1.83 3.75,3.75 1.83,-1.83z" />
</vector>
```

Create `packages/app-mobile/android/app/src/main/res/drawable/ic_widget_new_todo.xml`:

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
	android:width="24dp"
	android:height="24dp"
	android:viewportWidth="24"
	android:viewportHeight="24">
	<path
		android:fillColor="@color/widget_icon_tint"
		android:pathData="M19,3H5c-1.1,0 -2,0.9 -2,2v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2V5c0,-1.1 -0.9,-2 -2,-2zM10.3,16.6l-3.9,-3.9 1.3,-1.3 2.6,2.6 6.1,-6.1 1.3,1.3 -7.4,7.4z" />
</vector>
```

Create `packages/app-mobile/android/app/src/main/res/drawable/ic_widget_new_photo.xml`:

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
	android:width="24dp"
	android:height="24dp"
	android:viewportWidth="24"
	android:viewportHeight="24">
	<path
		android:fillColor="@color/widget_icon_tint"
		android:pathData="M12,15.2a3.2,3.2 0,0 0,3.2 -3.2a3.2,3.2 0,0 0,-3.2 -3.2a3.2,3.2 0,0 0,-3.2 3.2a3.2,3.2 0,0 0,3.2 3.2z" />
	<path
		android:fillColor="@color/widget_icon_tint"
		android:pathData="M9,2L7.17,4H4c-1.1,0 -2,0.9 -2,2v12c0,1.1 0.9,2 2,2h16c1.1,0 2,-0.9 2,-2V6c0,-1.1 -0.9,-2 -2,-2h-3.17L15,2H9zM12,17c-2.76,0 -5,-2.24 -5,-5s2.24,-5 5,-5 5,2.24 5,5 -2.24,5 -5,5z" />
</vector>
```

Create `packages/app-mobile/android/app/src/main/res/drawable/ic_widget_new_attachment.xml`:

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
	android:width="24dp"
	android:height="24dp"
	android:viewportWidth="24"
	android:viewportHeight="24">
	<path
		android:fillColor="@color/widget_icon_tint"
		android:pathData="M16.5,6v11.5c0,2.21 -1.79,4 -4,4s-4,-1.79 -4,-4V5c0,-1.38 1.12,-2.5 2.5,-2.5s2.5,1.12 2.5,2.5v10.5c0,0.55 -0.45,1 -1,1s-1,-0.45 -1,-1V6H10v9.5c0,1.38 1.12,2.5 2.5,2.5s2.5,-1.12 2.5,-2.5V5c0,-2.21 -1.79,-4 -4,-4S7,2.79 7,5v12.5c0,3.04 2.46,5.5 5.5,5.5s5.5,-2.46 5.5,-5.5V6h-1.5z" />
</vector>
```

Create `packages/app-mobile/android/app/src/main/res/drawable/ic_widget_new_drawing.xml`:

```xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
	android:width="24dp"
	android:height="24dp"
	android:viewportWidth="24"
	android:viewportHeight="24">
	<path
		android:fillColor="@color/widget_icon_tint"
		android:pathData="M7,14c-1.66,0 -3,1.34 -3,3 0,1.31 -1.16,2 -2,2 0.92,1.22 2.49,2 4,2 2.21,0 4,-1.79 4,-4 0,-1.66 -1.34,-3 -3,-3zM20.71,4.63l-1.34,-1.34c-0.39,-0.39 -1.02,-0.39 -1.41,0L9,12.25 11.75,15l8.96,-8.96c0.39,-0.39 0.39,-1.02 0,-1.41z" />
</vector>
```

- [ ] **Step 2: Create color and background resources**

Create `packages/app-mobile/android/app/src/main/res/values/widget_colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
	<color name="widget_icon_tint">#5F6368</color>
	<color name="widget_label_color">#3C4043</color>
	<color name="widget_background_color">#F2F2F4</color>
</resources>
```

Create `packages/app-mobile/android/app/src/main/res/values-night/widget_colors.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
	<color name="widget_icon_tint">#E8EAED</color>
	<color name="widget_label_color">#E8EAED</color>
	<color name="widget_background_color">#2D2F33</color>
</resources>
```

Create `packages/app-mobile/android/app/src/main/res/drawable/widget_background.xml`:

```xml
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
	<solid android:color="@color/widget_background_color" />
	<corners android:radius="16dp" />
</shape>
```

Create `packages/app-mobile/android/app/src/main/res/drawable-night/widget_background.xml` with identical content (the day/night color resolves differently through `@color/widget_background_color`):

```xml
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
	<solid android:color="@color/widget_background_color" />
	<corners android:radius="16dp" />
</shape>
```

- [ ] **Step 3: Create the widget layout**

Create `packages/app-mobile/android/app/src/main/res/layout/widget_quick_actions.xml`. Five identical slot blocks; only the trailing digit of every id differs (`slot_1`…`slot_5`, `icon_1`…`icon_5`, `label_1`…`label_5`). Full file:

```xml
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
	android:id="@+id/widget_root"
	android:layout_width="match_parent"
	android:layout_height="match_parent"
	android:orientation="horizontal"
	android:background="@drawable/widget_background"
	android:padding="4dp">

	<LinearLayout
		android:id="@+id/slot_1"
		android:layout_width="0dp"
		android:layout_height="match_parent"
		android:layout_weight="1"
		android:gravity="center"
		android:orientation="vertical"
		android:padding="4dp">

		<ImageView
			android:id="@+id/icon_1"
			android:layout_width="24dp"
			android:layout_height="24dp"
			android:src="@drawable/ic_widget_new_note"
			android:contentDescription="@string/widget_quick_actions_label" />

		<TextView
			android:id="@+id/label_1"
			android:layout_width="wrap_content"
			android:layout_height="wrap_content"
			android:textColor="@color/widget_label_color"
			android:textSize="11sp"
			android:maxLines="1"
			android:ellipsize="end" />
	</LinearLayout>

	<!-- slot_2 .. slot_5: repeat the slot_1 block above, replacing every
	     trailing _1 with _2, _3, _4, _5. The ids must match the arrays in
	     WidgetViewsBuilder.kt exactly. -->
</LinearLayout>
```

Repeat the slot block four more times so the file literally contains `slot_2`…`slot_5` (do not leave the comment in place of real blocks). The `ImageView` `src` placeholder for every slot is `@drawable/ic_widget_new_note` — the builder overrides it at runtime.

- [ ] **Step 4: Create the provider-info XML and picker label string**

Create `packages/app-mobile/android/app/src/main/res/xml/joplin_quick_actions_widget_info.xml`:

```xml
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
	android:minWidth="250dp"
	android:minHeight="40dp"
	android:minResizeWidth="40dp"
	android:minResizeHeight="40dp"
	android:maxResizeWidth="380dp"
	android:resizeMode="horizontal"
	android:targetCellWidth="5"
	android:targetCellHeight="1"
	android:widgetCategory="home_screen"
	android:widgetFeatures="reconfigurable"
	android:updatePeriodMillis="0"
	android:initialLayout="@layout/widget_quick_actions"
	android:previewLayout="@layout/widget_quick_actions"
	android:configure="net.cozic.joplin.widget.WidgetConfigActivity" />
```

(`targetCellWidth`/`widgetFeatures`/`previewLayout` are API 31+ only and safely ignored on older versions; dp bounds cover API 24–30.)

In `packages/app-mobile/android/app/src/main/res/values/strings.xml`, inside `<resources>`, add (tab-indented to match the file):

```xml
	<string name="widget_quick_actions_label">Joplin quick actions</string>
```

- [ ] **Step 5: Write the store, icon map, views builder, refresher, provider**

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetConfigStore.kt`:

```kotlin
package net.cozic.joplin.widget

import android.content.Context

class WidgetConfigStore(private val context: Context) {
	fun load(appWidgetId: Int): List<WidgetAction> =
		WidgetConfigCodec.deserialize(prefs().getString(key(appWidgetId), null))

	fun has(appWidgetId: Int): Boolean = prefs().contains(key(appWidgetId))

	fun save(appWidgetId: Int, actions: List<WidgetAction>) {
		prefs().edit().putString(key(appWidgetId), WidgetConfigCodec.serialize(actions)).apply()
	}

	fun clear(appWidgetId: Int) {
		prefs().edit().remove(key(appWidgetId)).apply()
	}

	private fun prefs() = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

	private fun key(appWidgetId: Int) = "widget_actions_$appWidgetId"

	companion object {
		private const val PREFS_NAME = "joplin_widget_quick_actions"
	}
}
```

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetIcons.kt`:

```kotlin
package net.cozic.joplin.widget

class WidgetIcons private constructor() {
	companion object {
		fun drawableIdFor(type: String): Int = when (type) {
			"newTodo" -> R.drawable.ic_widget_new_todo
			"newPhoto" -> R.drawable.ic_widget_new_photo
			"newResource" -> R.drawable.ic_widget_new_attachment
			"newDrawing" -> R.drawable.ic_widget_new_drawing
			else -> R.drawable.ic_widget_new_note
		}

		// Icon name recorded in the shortcut-item bundle to match the
		// format produced by setShortcutItems() in setupQuickActions.ts.
		fun iconNameFor(type: String): String = when (type) {
			"newTodo" -> "Add"
			"newPhoto" -> "CapturePhoto"
			"newResource" -> "Bookmark"
			"newDrawing" -> "Favorite"
			else -> "Compose"
		}
	}
}
```

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetViewsBuilder.kt`:

```kotlin
package net.cozic.joplin.widget

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.PersistableBundle
import android.view.View
import android.widget.RemoteViews

import net.cozic.joplin.MainActivity
import net.cozic.joplin.R

class WidgetViewsBuilder(private val context: Context) {
	fun build(slots: List<WidgetSlot>): RemoteViews {
		val views = RemoteViews(context.packageName, R.layout.widget_quick_actions)
		for (slot in slots) {
			val index = slot.slotIndex
			val action = slot.action
			if (action == null) {
				views.setViewVisibility(slotIds[index], View.GONE)
				continue
			}
			views.setViewVisibility(slotIds[index], View.VISIBLE)
			views.setImageViewResource(iconIds[index], WidgetIcons.drawableIdFor(action.type))
			views.setTextViewText(labelIds[index], action.title)
			views.setViewVisibility(labelIds[index], if (slot.labelVisible) View.VISIBLE else View.GONE)
			views.setContentDescription(slotIds[index], action.title)
			views.setOnClickPendingIntent(slotIds[index], pendingIntentFor(action))
		}
		return views
	}

	private fun pendingIntentFor(action: WidgetAction): PendingIntent {
		// Duplicates the intent contract of react-native-quick-actions
		// (AppShortcutsModule.java in jordanbyron/react-native-quick-actions):
		// a MainActivity intent with action "ACTION_SHORTCUT" and a
		// PersistableBundle extra "SHORTCUT_ITEM" carrying type/title/icon/userInfo.
		// Matching that format lets widget taps reuse the existing
		// quickActionShortcut handling in setupQuickActions.ts unchanged.
		val intent = Intent(context, MainActivity::class.java).apply {
			setAction(ACTION_QUICK_ACTION)
			putExtra(
				EXTRA_SHORTCUT_ITEM,
				PersistableBundle().apply {
					putString("type", action.type)
					putString("title", action.title)
					putString("icon", WidgetIcons.iconNameFor(action.type))
					putPersistableBundle("userInfo", PersistableBundle().apply { putString("url", "") })
				},
			)
		}
		return PendingIntent.getActivity(
			context,
			action.type.hashCode(),
			intent,
			PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
		)
	}

	companion object {
		const val ACTION_QUICK_ACTION = "ACTION_SHORTCUT"
		const val EXTRA_SHORTCUT_ITEM = "SHORTCUT_ITEM"

		private val slotIds = intArrayOf(R.id.slot_1, R.id.slot_2, R.id.slot_3, R.id.slot_4, R.id.slot_5)
		private val iconIds = intArrayOf(R.id.icon_1, R.id.icon_2, R.id.icon_3, R.id.icon_4, R.id.icon_5)
		private val labelIds = intArrayOf(R.id.label_1, R.id.label_2, R.id.label_3, R.id.label_4, R.id.label_5)
	}
}
```

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetRefresher.kt`:

```kotlin
package net.cozic.joplin.widget

import android.appwidget.AppWidgetManager
import android.content.Context

object WidgetRefresher {
	// Below this width (in dp) labels are hidden and buttons show icons only.
	const val LABEL_VISIBLE_MIN_WIDTH_DP = 180

	fun refresh(context: Context, appWidgetId: Int) {
		val manager = AppWidgetManager.getInstance(context)
		val minWidth = manager.getAppWidgetOptions(appWidgetId)
			.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
		refresh(context, appWidgetId, minWidth)
	}

	fun refresh(context: Context, appWidgetId: Int, minWidthDp: Int) {
		val actions = WidgetConfigStore(context).load(appWidgetId)
		val slots = WidgetSlotMapper.slotsFor(actions, showLabels = minWidthDp >= LABEL_VISIBLE_MIN_WIDTH_DP)
		val views = WidgetViewsBuilder(context).build(slots)
		AppWidgetManager.getInstance(context).updateAppWidget(appWidgetId, views)
	}
}
```

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/JoplinQuickActionsWidgetProvider.kt`:

```kotlin
package net.cozic.joplin.widget

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context

class JoplinQuickActionsWidgetProvider : AppWidgetProvider() {
	override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
		for (appWidgetId in appWidgetIds) {
			WidgetRefresher.refresh(context, appWidgetId)
		}
	}

	override fun onAppWidgetOptionsChanged(
		context: Context,
		appWidgetManager: AppWidgetManager,
		appWidgetId: Int,
		newOptions: android.os.Bundle,
	) {
		val minWidth = newOptions.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 0)
		WidgetRefresher.refresh(context, appWidgetId, minWidth)
	}

	override fun onDeleted(context: Context, appWidgetIds: IntArray) {
		val store = WidgetConfigStore(context)
		for (appWidgetId in appWidgetIds) {
			store.clear(appWidgetId)
		}
	}
}
```

- [ ] **Step 6: Register the receiver in the manifest**

In `packages/app-mobile/android/app/src/main/AndroidManifest.xml`, inside `<application>`, insert the following directly before the closing `</application>` tag (the `WidgetConfigActivity` referenced by the provider-info XML is added to the manifest itself only in Task 4 — that is fine, the `android:configure` link is resolved at runtime, not at build time):

```xml
		<receiver
			android:name=".widget.JoplinQuickActionsWidgetProvider"
			android:exported="false"
			android:label="@string/widget_quick_actions_label">
			<intent-filter>
				<action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
			</intent-filter>
			<meta-data
				android:name="android.appwidget.provider"
				android:resource="@xml/joplin_quick_actions_widget_info" />
		</receiver>
```

(The provider-info XML references `WidgetConfigActivity` before it exists; the manifest link to the activity is only resolved at runtime, so this compiles now and works once Task 4 adds the activity.)

- [ ] **Step 7: Compile and run unit tests**

Run: `cd packages/app-mobile/android && ./gradlew :app:compileDebugKotlin :app:testDebugUnitTest`
Expected: BUILD SUCCESSFUL, both test classes green.

- [ ] **Step 8: Commit**

```bash
git add packages/app-mobile/android/app/src/main/res packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget packages/app-mobile/android/app/src/main/AndroidManifest.xml
git commit -m "Mobile: Add quick actions widget provider and resources"
```

---

### Task 4: Config activity + JoplinWidget native module

**Files:**
- Create: `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetConfigActivity.kt`
- Create: `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetPackage.kt`
- Modify: `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/MainApplication.kt` (register package)
- Modify: `packages/app-mobile/android/app/src/main/AndroidManifest.xml` (add activity)

**Interfaces:**
- Consumes: `WidgetConfigStore`, `WidgetRefresher` (Task 3).
- Produces: JS-facing native module `NativeModules.JoplinWidget` with `getConfigInfo(): Promise<{ appWidgetId: number, items: { type: string, title: string }[] | null }>` (items `null` on fresh creation), `saveConfig(appWidgetId: number, items: { type: string, title: string }[]): Promise<null>`, `cancelConfig(): Promise<null>`. Also Android activity `net.cozic.joplin.widget.WidgetConfigActivity` hosting React component name `widgetConfig` (registered in Task 5).

- [ ] **Step 1: Create the config activity**

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetConfigActivity.kt`:

```kotlin
package net.cozic.joplin.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper
import net.cozic.joplin.BuildConfig

class WidgetConfigActivity : ReactActivity() {
	val appWidgetId: Int
		get() = intent?.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
			?: AppWidgetManager.INVALID_APPWIDGET_ID

	override fun getMainComponentName(): String = "widgetConfig"

	override fun createReactActivityDelegate(): ReactActivityDelegate =
		ReactActivityDelegateWrapper(this, BuildConfig.IS_NEW_ARCHITECTURE_ENABLED, DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled))

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		// The default result must be RESULT_CANCELED so that backing out
		// of the config screen cancels the widget add (see
		// https://developer.android.com/develop/ui/views/appwidgets/configuration).
		setResult(Activity.RESULT_CANCELED)
	}
}
```

- [ ] **Step 2: Create the native module and package**

Create `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/WidgetPackage.kt`:

```kotlin
package net.cozic.joplin.widget

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Intent

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.uimanager.ViewManager

class WidgetPackage : ReactPackage {
	override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
		listOf(WidgetManagerModule(reactContext))

	override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
		emptyList()
}

class WidgetManagerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
	override fun getName() = "JoplinWidget"

	@ReactMethod
	fun getConfigInfo(promise: Promise) {
		val activity = currentActivity
		if (activity !is WidgetConfigActivity) {
			promise.reject("NO_CONFIG_ACTIVITY", "Widget config activity is not in the foreground")
			return
		}
		val store = WidgetConfigStore(reactApplicationContext)
		val map = Arguments.createMap()
		map.putInt("appWidgetId", activity.appWidgetId)
		val saved = if (store.has(activity.appWidgetId)) {
			val items = Arguments.createArray()
			for (action in store.load(activity.appWidgetId)) {
				val item = Arguments.createMap()
				item.putString("type", action.type)
				item.putString("title", action.title)
				items.pushMap(item)
			}
			items
		} else {
			null
		}
		map.putArray("items", saved)
		promise.resolve(map)
	}

	@ReactMethod
	fun saveConfig(appWidgetId: Int, items: ReadableArray, promise: Promise) {
		val actions = mutableListOf<WidgetAction>()
		for (i in 0 until items.size()) {
			val item = items.getMap(i) ?: continue
			val type = item.getString("type") ?: continue
			val title = item.getString("title") ?: continue
			actions.add(WidgetAction(type, title))
		}
		if (actions.isEmpty()) {
			promise.reject("EMPTY_CONFIG", "At least one action must be selected")
			return
		}
		WidgetConfigStore(reactApplicationContext).save(appWidgetId, actions)
		WidgetRefresher.refresh(reactApplicationContext, appWidgetId)

		currentActivity?.let { activity ->
			val result = Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
			activity.setResult(Activity.RESULT_OK, result)
			activity.finish()
		}
		promise.resolve(null)
	}

	@ReactMethod
	fun cancelConfig(promise: Promise) {
		currentActivity?.finish()
		promise.resolve(null)
	}

	@ReactMethod
	fun addListener(eventName: String) {}

	@ReactMethod
	fun removeListeners(count: Int) {}
}
```

- [ ] **Step 3: Register the package and the activity**

In `packages/app-mobile/android/app/src/main/java/net/cozic/joplin/MainApplication.kt`, add to the imports (alphabetical position, after `import net.cozic.joplin.systeminfo.SystemInformationPackage`):

```kotlin
import net.cozic.joplin.widget.WidgetPackage
```

and inside `getPackages()`'s `apply { ... }` block, after `add(SystemInformationPackage())`, add:

```kotlin
                    add(WidgetPackage())
```

(match the surrounding indentation exactly — that block is indented with tabs).

In `packages/app-mobile/android/app/src/main/AndroidManifest.xml`, inside `<application>`, immediately BEFORE the `<receiver>` added in Task 3, insert:

```xml
		<activity
			android:name=".widget.WidgetConfigActivity"
			android:exported="true"
			android:theme="@style/AppTheme">
			<intent-filter>
				<action android:name="android.appwidget.action.APPWIDGET_CONFIGURE" />
			</intent-filter>
		</activity>
```

(`exported="true"` with the `APPWIDGET_CONFIGURE` filter is required because the launcher app — not Joplin — launches this activity.)

- [ ] **Step 4: Compile and run unit tests**

Run: `cd packages/app-mobile/android && ./gradlew :app:compileDebugKotlin :app:testDebugUnitTest`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**

```bash
git add packages/app-mobile/android/app/src/main/java/net/cozic/joplin packages/app-mobile/android/app/src/main/AndroidManifest.xml
git commit -m "Mobile: Add widget config activity and JoplinWidget native module"
```

---

### Task 5: JS config screen, quick-action definitions, entry registration, tests

**Files:**
- Create: `packages/app-mobile/components/WidgetConfig/types.ts`
- Create: `packages/app-mobile/components/WidgetConfig/quickActions.ts`
- Create: `packages/app-mobile/components/WidgetConfig/WidgetConfigScreen.tsx`
- Create: `packages/app-mobile/components/WidgetConfig/WidgetConfigScreen.test.tsx`
- Modify: `packages/app-mobile/index.js` (register `widgetConfig` component)

**Interfaces:**
- Consumes: `NativeModules.JoplinWidget` from Task 4 (`getConfigInfo`, `saveConfig`, `cancelConfig`).
- Produces: React component `WidgetConfigScreen` (default export) registered under AppRegistry name `widgetConfig`; `type QuickActionType = 'newNote' | 'newTodo' | 'newPhoto' | 'newResource' | 'newDrawing'`; `quickActionDefs` array of `{ type, title(): string, icon }`.

- [ ] **Step 1: Write the failing tests**

Create `packages/app-mobile/components/WidgetConfig/WidgetConfigScreen.test.tsx` (the `jest.mock` block must be the first thing in the file — before any import that touches `NativeModules`):

```tsx
jest.mock('react-native', () => {
	const rn = jest.requireActual('react-native');
	return {
		...rn,
		NativeModules: {
			...rn.NativeModules,
			JoplinWidget: {
				getConfigInfo: jest.fn(),
				saveConfig: jest.fn(),
				cancelConfig: jest.fn(),
			},
		},
	};
});

import * as React from 'react';
import { NativeModules } from 'react-native';

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '../../utils/testing/testingLibrary';

import WidgetConfigScreen from './WidgetConfigScreen';

const joplinWidgetMock = NativeModules.JoplinWidget as {
	getConfigInfo: jest.Mock;
	saveConfig: jest.Mock;
	cancelConfig: jest.Mock;
};

const renderScreen = () => render(<WidgetConfigScreen />);

const selectActions = async (types: string[]) => {
	for (const type of types) {
		fireEvent.press(await screen.findByTestId(`available-${type}`));
	}
};

describe('WidgetConfigScreen', () => {
	beforeEach(() => {
		joplinWidgetMock.getConfigInfo.mockReset();
		joplinWidgetMock.saveConfig.mockReset();
		joplinWidgetMock.cancelConfig.mockReset();
		joplinWidgetMock.getConfigInfo.mockResolvedValue({ appWidgetId: 5, items: null });
		joplinWidgetMock.saveConfig.mockResolvedValue(null);
		joplinWidgetMock.cancelConfig.mockResolvedValue(null);
	});

	it('builds the selection in tap order and saves it', async () => {
		renderScreen();
		await selectActions(['newPhoto', 'newNote']);

		expect(await screen.findByTestId('selected-newPhoto')).toBeTruthy();
		expect(screen.getByTestId('selected-newNote')).toBeTruthy();

		fireEvent.press(screen.getByTestId('save-button'));

		await waitFor(() => {
			expect(joplinWidgetMock.saveConfig).toHaveBeenCalledWith(5, [
				{ type: 'newPhoto', title: 'New photo' },
				{ type: 'newNote', title: 'New note' },
			]);
		});
	});

	it('removes an action from the middle and keeps the remaining order', async () => {
		renderScreen();
		await selectActions(['newNote', 'newPhoto', 'newTodo']);

		fireEvent.press(screen.getByTestId('selected-newPhoto'));
		fireEvent.press(screen.getByTestId('save-button'));

		await waitFor(() => {
			expect(joplinWidgetMock.saveConfig).toHaveBeenCalledWith(5, [
				{ type: 'newNote', title: 'New note' },
				{ type: 'newTodo', title: 'New to-do' },
			]);
		});
	});

	it('disables save when nothing is selected', async () => {
		renderScreen();
		const saveButton = await screen.findByTestId('save-button');
		expect(saveButton).toBeDisabled();
	});

	it('prefills from the saved config on reconfigure', async () => {
		joplinWidgetMock.getConfigInfo.mockResolvedValue({
			appWidgetId: 7,
			items: [
				{ type: 'newTodo', title: 'New to-do' },
				{ type: 'newDrawing', title: 'New drawing' },
			],
		});
		renderScreen();

		expect(await screen.findByTestId('selected-newTodo')).toBeTruthy();
		expect(screen.getByTestId('selected-newDrawing')).toBeTruthy();
		expect(screen.queryByTestId('selected-newNote')).toBeNull();
	});

	it('cancels via cancelConfig', async () => {
		renderScreen();
		fireEvent.press(await screen.findByTestId('cancel-button'));

		await waitFor(() => {
			expect(joplinWidgetMock.cancelConfig).toHaveBeenCalled();
		});
		expect(joplinWidgetMock.saveConfig).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd packages/app-mobile && yarn test WidgetConfigScreen`
Expected: FAIL — cannot resolve `./WidgetConfigScreen`.

- [ ] **Step 3: Write types and quick-action definitions**

Create `packages/app-mobile/components/WidgetConfig/types.ts`:

```ts
export type QuickActionType = 'newNote' | 'newTodo' | 'newPhoto' | 'newResource' | 'newDrawing';

export interface WidgetConfigItem {
	type: QuickActionType;
	title: string;
}
```

Create `packages/app-mobile/components/WidgetConfig/quickActions.ts`:

```ts
import { _ } from '@joplin/lib/locale';
import { QuickActionType } from './types';

interface QuickActionDef {
	type: QuickActionType;
	title: () => string;
	icon: string;
}

export const quickActionDefs: QuickActionDef[] = [
	{ type: 'newNote', title: () => _('New note'), icon: 'fa fa-pen' },
	{ type: 'newTodo', title: () => _('New to-do'), icon: 'fa fa-check-square' },
	{ type: 'newPhoto', title: () => _('New photo'), icon: 'fa fa-camera' },
	{ type: 'newResource', title: () => _('New attachment'), icon: 'fa fa-paperclip' },
	{ type: 'newDrawing', title: () => _('New drawing'), icon: 'fa fa-paint-brush' },
];

export const defForType = (type: QuickActionType): QuickActionDef => {
	const def = quickActionDefs.find(d => d.type === type);
	if (!def) throw new Error(`Unknown quick action type: ${type}`);
	return def;
};
```

- [ ] **Step 4: Write the config screen**

Create `packages/app-mobile/components/WidgetConfig/WidgetConfigScreen.tsx`:

```tsx
import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { NativeModules, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Button, PaperProvider, useTheme } from 'react-native-paper';

import Icon from '../Icon';
import { quickActionDefs, defForType } from './quickActions';
import { QuickActionType } from './types';

const JoplinWidget = NativeModules.JoplinWidget;

interface ConfigInfo {
	appWidgetId: number;
	items: { type: QuickActionType; title: string }[] | null;
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		padding: 16,
	},
	title: {
		fontSize: 20,
		marginBottom: 16,
	},
	sectionLabel: {
		fontSize: 14,
		marginBottom: 8,
	},
	selectedRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 24,
	},
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 16,
		paddingHorizontal: 12,
		paddingVertical: 8,
		gap: 6,
	},
	chipText: {
		fontSize: 14,
	},
	actionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		gap: 12,
	},
	actionTitle: {
		fontSize: 16,
	},
	actions: {
		marginBottom: 24,
	},
	buttons: {
		flexDirection: 'row',
		gap: 12,
	},
});

const ConfigScreenContent: React.FC = () => {
	const [selected, setSelected] = useState<QuickActionType[]>([]);
	const [appWidgetId, setAppWidgetId] = useState(-1);
	const theme = useTheme();

	useEffect(() => {
		JoplinWidget.getConfigInfo().then((info: ConfigInfo) => {
			setAppWidgetId(info.appWidgetId);
			if (info.items) setSelected(info.items.map(item => item.type));
		}).catch((error: unknown) => {
			console.error('Failed to load widget config', error);
		});
	}, []);

	const addAction = useCallback((type: QuickActionType) => {
		setSelected(current => current.includes(type) ? current : [...current, type]);
	}, []);

	const removeAction = useCallback((type: QuickActionType) => {
		setSelected(current => current.filter(t => t !== type));
	}, []);

	const save = useCallback(async () => {
		const items = selected.map(type => ({ type, title: defForType(type).title() }));
		await JoplinWidget.saveConfig(appWidgetId, items);
	}, [selected, appWidgetId]);

	const cancel = useCallback(async () => {
		await JoplinWidget.cancelConfig();
	}, []);

	return (
		<ScrollView style={styles.root}>
			<Text style={[styles.title, { color: theme.colors.onSurface }]}>Joplin widget</Text>

			<Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Selected actions (tap to remove)</Text>
			<View style={styles.selectedRow}>
				{selected.map((type, index) => {
					const def = defForType(type);
					return (
						<TouchableOpacity
							key={type}
							testID={`selected-${type}`}
							onPress={() => removeAction(type)}
							style={[styles.chip, { backgroundColor: theme.colors.primaryContainer }]}
						>
							<Text style={styles.chipText}>{index + 1}.</Text>
							<Icon name={def.icon} style={styles.chipText} accessibilityLabel={null} />
							<Text style={[styles.chipText, { color: theme.colors.onSurface }]}>{def.title()}</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Available actions (tap to add)</Text>
			<View style={styles.actions}>
				{quickActionDefs.map(def => {
					const isSelected = selected.includes(def.type);
					return (
						<TouchableOpacity
							key={def.type}
							testID={`available-${def.type}`}
							onPress={() => addAction(def.type)}
							disabled={isSelected}
							style={styles.actionRow}
						>
							<Icon name={def.icon} style={styles.actionTitle} accessibilityLabel={null} />
							<Text style={[styles.actionTitle, { color: isSelected ? theme.colors.onSurfaceDisabled : theme.colors.onSurface }]}>{def.title()}</Text>
						</TouchableOpacity>
					);
				})}
			</View>

			<View style={styles.buttons}>
				<Button testID='save-button' mode='contained' disabled={selected.length === 0} onPress={save}>Save</Button>
				<Button testID='cancel-button' mode='outlined' onPress={cancel}>Cancel</Button>
			</View>
		</ScrollView>
	);
};

const WidgetConfigScreen: React.FC = () => {
	return (
		<PaperProvider>
			<ConfigScreenContent />
		</PaperProvider>
	);
};

export default WidgetConfigScreen;
```

- [ ] **Step 5: Register the widgetConfig entry**

In `packages/app-mobile/index.js`, add to the imports near the top (after `import Root from './root';`):

```js
import { AppRegistry } from 'react-native';
import WidgetConfigScreen from './components/WidgetConfig/WidgetConfigScreen';
```

and after `registerRootComponent(Root);` add:

```js
AppRegistry.registerComponent('widgetConfig', () => WidgetConfigScreen);
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd packages/app-mobile && yarn test WidgetConfigScreen`
Expected: PASS — 5 tests green. If `Icon` rendering fails in tests, wrap it: the `Icon` component needs no provider; a failure usually means a typo in the icon name.

- [ ] **Step 7: Commit**

```bash
git add packages/app-mobile/components/WidgetConfig packages/app-mobile/index.js
git commit -m "Mobile: Add widget configuration screen"
```

---

### Task 6: Repo hygiene and full verification

**Files:**
- Modify: `.cspell.json` or per instructions in `readme/dev/spellcheck.md` (only if cSpell flags new words)
- No other new files.

**Interfaces:**
- Consumes: everything from Tasks 1–5.
- Produces: verified green build.

- [ ] **Step 1: Run `yarn updateIgnored` (new TypeScript files were added)**

Run: `yarn updateIgnored`
Expected: exits 0; may update ignore lists — commit any changed files it produces.

- [ ] **Step 2: Type-check**

Run: `yarn tsc --noEmit`
Expected: no errors. (If a pre-existing unrelated error appears, verify it exists on `HEAD~` too before ignoring it.)

- [ ] **Step 3: Lint new JS/TS files**

Run: `yarn eslint packages/app-mobile/components/WidgetConfig packages/app-mobile/index.js`
Expected: no errors. Fix style issues (tabs, quotes) that ESLint reports.

- [ ] **Step 4: Run the full app-mobile Jest suite**

Run: `cd packages/app-mobile && yarn test`
Expected: all tests pass, including the pre-existing suite (regressions would indicate the `index.js` change or the react-native mock leaked).

- [ ] **Step 5: Run Android unit tests and compile**

Run: `cd packages/app-mobile/android && ./gradlew :app:testDebugUnitTest :app:compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 6: cSpell check (if CI runs it locally)**

Run: `yarn spellcheck 2>/dev/null || npx cspell lint "packages/app-mobile/components/WidgetConfig/**" "packages/app-mobile/android/app/src/main/java/net/cozic/joplin/widget/**" --no-progress`
Expected: no unknown words. If flagged, follow `readme/dev/spellcheck.md` (words like `appwidget`, `RemoteViews` may need adding to the project dictionary via `cspell.json` `words` list or inline ignore, exactly as that doc specifies).

- [ ] **Step 7: Commit hygiene changes**

```bash
git add -A
git commit -m "Mobile: Widget quick actions - repo hygiene" --allow-empty
```

(Skip committing if nothing changed; `--allow-empty` makes the step safe either way.)

- [ ] **Step 8: Manual QA checklist (emulator with API 33+ recommended)**

Build and install: `cd packages/app-mobile/android && ./gradlew :app:installDebug`, then:

1. Long-press home screen → Widgets → Joplin → add at default size. Config screen opens with empty selection and disabled Save.
2. Tap New note, then New photo. Selected shows "1. New note, 2. New photo". Save. Widget shows two buttons (photo renders icon-only or labeled depending on width).
3. Resize the widget from 1 to 5 columns and back — buttons redistribute; labels appear when wide (~180dp+), icons only when narrow.
4. Tap New photo on the widget (warm app): app opens a new note with the camera action. Kill the app from recents, tap again (cold start): same result after app boots.
5. Long-press the widget → Reconfigure: screen prefilled with the saved selection; reorder by removing/re-adding; Save.
6. Add a second widget instance with a different selection; verify both keep independent configs. Delete one; verify the other is unaffected.
7. Toggle system dark mode: widget background/icons/labels switch.
8. API 24–30 emulator if available: add + resize using dp fallbacks; verify no crash (Reconfigure menu item will be absent — expected).

---

## Self-Review Notes

- Spec coverage: five actions (Tasks 1/3/5), 1–5 column horizontal sizing + reconfigurable (Task 3 provider XML), creation-time config with free ordering (Tasks 4–5), per-instance configs + cleanup (Tasks 1/3), warm/cold tap parity via the quick-actions intent contract (Task 3 `WidgetViewsBuilder`), corrupt-config fallback (Task 1 codec), labels from JS locale at save time (Task 5), testing matrix (Tasks 1–2 unit, Task 5 Jest, Task 6 manual).
- Known deviations from spec text, all corrected in the spec before this plan: configure activity `exported="true"` + `APPWIDGET_CONFIGURE` filter; save payload `{type, title}` (icon mapped natively).
- Testing deviation: the spec's "RemoteViews construction" unit tests are realized as `WidgetSlotMapperTest` assertions (visible-slot count, order, labels) — `RemoteViews` calls themselves are Android-framework glue that cannot run in plain JVM unit tests without Robolectric; they are covered by the manual QA checklist instead.
- Type consistency: `WidgetAction(type, title)` used identically in Kotlin tasks; JS `QuickActionType` string literals match Kotlin `type` strings and `WidgetIcons`/`DefaultWidgetActions` mappings; `JoplinWidget` method names identical in Task 4 (Kotlin `@ReactMethod`) and Task 5 (JS calls + mock).
