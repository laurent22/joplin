---
forum_url: https://discourse.joplinapp.org/t/35525
---

# Support for new plugin metadata

The plugin manifest now supports new properties to better describe and present your plugins on Joplin Plugins website. Those are the `icons`, `categories`, `screenshots` and `promo_tile` properties. 

## Icon

This is the icon that will be used in various plugin pages, including in your main plugin page. It will be shown on the main result page too. If not provided, a default icon will be displayed instead.

## Category

You can supply one or more category for your plugin - it will be used to filter the plugins on the website.

## Screenshots

Again you can provide one or more screenshots to present your plugin on the website.

![](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/news/20240127-icon-category-screenshot.png)

*An example of plugin with icon, category and screenshot*

## Promo tile

The promo tile is an optional image that is used to display your plugin on the main website page. If no promo tile is supplied, the icon will be used instead.

![](https://raw.githubusercontent.com/laurent22/joplin/dev/Assets/WebsiteAssets/images/news/20240127-promo-tile.png)

*An example of promo tile*

## More information

For more information on how to set this plugin metadata, please check the [Plugin Manifest documentation](https://joplinapp.org/help/api/references/plugin_manifest)
