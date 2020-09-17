# Creating a table of content plugin

This tutorial will guide you through the steps to create a table of content plugin for Joplin. It will display a view next to the current note that will contain links to the sections of a note. It will be possible to click on one of the header to jump to the relevant section.

Through this tutorial you will learn about several aspect of the Joplin API, including:

- The plugin API
- How to create a webview
- How to listen to changes in the user interface

## Setting up your environment

Before getting any further, make sure your environment is setup correctly as described in the [Get Started guide]().

## Registering the plugin


## Getting the current note

introduce data api
print to console
listen to note change events

## Getting the note sections

get all h1, h2, etc.

## Creating a webview

Make it display basic content
implement updateTocView

## Styling the view

## Making the webview interactive

First add a script - when clicking on link, display the slug

## Passing messages between the webview and the plugin

For security reason, webviews run within their own sandbox (iframe) and thus do not have access to the Joplin API. You can however send messages to and from the webview to the plugin, from where you can call the Joplin API.

