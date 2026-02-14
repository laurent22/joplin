# Mobile startup performance

Android app can be slow to start on certain devices (about 3 seconds).

The app was analysed using Perfetto: https://github.com/laurent22/joplin/issues/14197

One fix was applied: upgrading expo-modules-core which had severe performance issues.

It appears that the rest of it cannot be optimised and is mostly due to the way React Native works and the size of the application.

More detailed report below:

## Why there’s no big optimisation left

### 1) The only abnormal cost is already fixed

You identified and removed the real regression:

* **ExpoFetchModule registration**

  * Before: **~520 ms**
  * After: **~4 ms**
* **Total Expo module registration**

  * Before: **~1424 ms**
  * After: **~61 ms**

That was the *one* clearly broken thing. It’s gone.

## What remains is normal, structural cost

### 2) React Native core initialisation is eager and synchronous

Measured costs:

* `ReactInstance.initialize` → **~266 ms**
* `getConstantsForViewManager` → **~254 ms**

  * **46 ViewManagers**
  * Cost scales roughly linearly with count
* `initTurboModules` → **~121 ms**

➡️ **~600–650 ms total**, before any UI can render.

You cannot:

* lazy-load ViewManagers
* lazy-load most TurboModules
* parallelise this work

This is **by design** in RN.

### 3) Native library loading is fixed overhead

Measured costs:

* `SoLoader.loadLibrary[appmodules]` → **~95 ms**
* `SoLoader.loadLibrary[expo-modules-core]` → **~9 ms**
* Hermes libraries → **~100+ ms total**

This is:

* native I/O + relocation
* one-time
* not affected by JS or RN changes

### 4) Android framework + IPC dominates the rest

Measured during startup window:

* Binder transactions + replies → **~1.6 s total**

  * ~433 calls
  * no single slow call (max ~46 ms)
* Animation / traversal / draw / present → **~1+ s combined**

This is:

* WindowManager
* ActivityManager
* SurfaceFlinger
* input / focus plumbing

➡️ **System-owned work**. You can’t optimise it from app code.

### 5) GC time stretches everything

Measured:

* GC during early startup → **~835 ms**

GC overlaps RN + system work, increasing *wall-clock* time, but:

* no single GC pause dominates
* mostly allocation pressure from startup churn

You already reduced the worst allocation source (Expo reflection).

## Why “small tweaks” don’t help anymore

* Lazy-loading JS → doesn’t affect native init
* Removing one Expo module → saves **single-digit ms**
* Chasing binder calls → symptoms, not cause
* Micro-optimising TurboModules → nothing stands out

What’s left is **many 100–300 ms chunks**, none removable alone.

## What this means in practice

* **Cold start ~2.5–3 s** for a medium/large RN app on Android is *normal*
* You’re now limited by:

  * RN architecture (eager native init)
  * Android startup pipeline
  * native loading + GC

Further improvements are:

* **incremental** (baseline profile, trimming libs)
* **architectural** (smaller first render)
* or **perceptual** (change what “ready” means)

### Bottom line

Your profiling shows a **healthy but heavy startup**, not a bug.
You’ve already fixed the only clear regression; the remaining time is the unavoidable cost of RN + Android doing their jobs.
