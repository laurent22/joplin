# react-native-markdown-editor

[![npm version](https://badge.fury.io/js/react-native-markdown-editor.svg)](https://badge.fury.io/js/react-native-markdown-editor)
[![Build Status](https://travis-ci.org/kunall17/react-native-markdown-editor.svg?branch=master)](https://travis-ci.org/kunall17/react-native-markdown-editor)

This is a library for rendering a markdown editor for the markdown with helper buttons to easily write markdown. With live preview markdown as well (thanks to https://github.com/Benjamin-Dobell/react-native-markdown-view)

## Index

* [Getting started](#getting-started)
* [Screenshots](#screenshots)
* [Features](#features)
* [Usage](#usage)
* [Customizing](#Customizing)
    * [Your own custom formats](#your-own-custom-formats)
    * [Customize the helper button](#customize-the-helper-button)
    * [Customize the markdownButton styles](#customize-the-markdownbutton-styles)
* [Props for the Markdown Editor](#props)
* [Contributing](#contributing)

## Getting Started

Install the node module:

    `yarn add react-native-markdown-editor`

or with npm:

    `npm install --save react-native-markdown-editor`

Then see [Usage](#usage) for futher details

## Screenshots

Screenshot:

<img src="https://raw.githubusercontent.com/kunall17/react-native-markdown-editor/static/Screenshot.png" width="40%" />

## Features

* Multiline textinput for writing markdown
* Live preview of the markdown written (can be hidden)
* Helper buttons to write the syntax for the markdown (like github)  


<details>
  <summary>Markdown where editor helps (in order for the default format)</summary>
<p>

**Bold Text**

*Italic Text*

__Underline text__

~~Strikethrough~~

`Inline code`

* Item 1
* Item 2

Url Links:

[GitHub](http://github.com)

```
function codeExample(arg) {
}
```

# This is an < h1 > tag

</p>
</details>

## Usage

Import the editor through

`import { MarkdownEditor } from 'react-native-markdown-editor';`

And use like this this in the jsx

`<MarkdownEditor />`

And pass a function `onMarkdownChange` which will be callback when markdown is changed

```
 <MarkdownEditor onMarkdownChange={this.onTextChange} />
```

It can be used with a toolbar and have a submit menu option there!

## Customizing


##### Your own custom formats
You can give a custom list of buttons you want to give the default is [Formats](https://github.com/kunall17/react-native-markdown-editor/blob/master/lib/src/Formats.js) by speicifying

```
   <MarkdownEditor Formats={YOUR_CUSTOM_Formats} />
```

#### Customize the helper button

You can customize the helper button using the `markdownButton` prop.
The buttons are rendered using a `FlatList` and the data passed is the [Formats](https://github.com/kunall17/react-native-markdown-editor/blob/master/lib/src/Formats.js)

markdownButton can be method like

```
const defaultMarkdownButton = ({ item, getState, setState }) =>
  <Button
    title={item.key}
    onPress={() => item.onPress({ getState, setState, item })}
    color={FOREGROUND_COLOR}
    style={inlinePadding}
  />
```

Where item is an each object in the Formats list

You can also import the methods used in [Formats](https://github.com/kunall17/react-native-markdown-editor/blob/master/lib/src/Formats.js) by using

```
import { applyWrapFormatNewLines, applyWrapFormat, applyWebLinkFormat, applyListFormat } from 'react-native-markdown-editor';
```

#### Customize the renderButton styles

You can add a style key in the Formats.js and this will be used while rendering the button

```  
{ key: 'B', wrapper: '**', onPress: applyWrapFormat, style: { fontWeight: 'bold' } },
```


## Props

| Name             | Type     | Default                                                                                                                   | Description                                      |
|:---------------- |:-------- |:------------------------------------------------------------------------------------------------------------------------- |:------------------------------------------------ |
| Formats          | Array    | [Formats](https://github.com/kunall17/react-native-markdown-editor/blob/master/lib/src/Formats.js)                        | Elements for the markdown buttons                |
| markdownButton   | function | [defaultMarkdownButton](https://github.com/kunall17/react-native-markdown-editor/blob/master/lib/src/renderButtons.js#L9) | A custom function to render the markdown buttons |
| onMarkdownChange | function |                                                                                                                           | Callback function, calls when markdown is typed  |
| showPreview      | boolean  | false                                                                                                                     | To show the markdown preview by Default          |
| defaultText      | text     | ''                                                                                                                        | To load some default text in the editor          |

## Contributing

PR's/Issues/Bugs or suggestions are welcomed kindly post them in the https://github.com/kunall17/react-native-markdown-editor/issues section.


## License

The MIT License.

[See LICENSE](LICENSE.md)
