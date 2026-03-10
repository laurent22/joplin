// Allows referencing the Joplin global:
/* eslint-disable no-undef */

// Allows the `joplin-manifest` block comment:
/* eslint-disable multiline-comment-style */

/* joplin-manifest:
{
	"id": "org.joplinapp.plugins.example.crashBeforeRegister",
	"manifest_version": 1,
	"app_min_version": "3.1",
	"name": "Crash Before Register",
	"description": "Plugin that crashes before calling register()",
	"version": "1.0.0",
	"author": "",
	"homepage_url": "https://joplinapp.org"
}
*/

// Crash before calling joplin.plugins.register()
// This tests the fix for https://github.com/laurent22/joplin/issues/12793
throw new Error('Simulated plugin crash before register()');
