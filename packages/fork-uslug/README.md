# Uslug.js

* * *

Modified for Joplin:

- Added support for emojis - "🐶🐶🐶🐱" => "dogdogdogcat"

* * *

Permissive slug generator that works with unicode.
We keep only characters from the categories Letter, Number and Separator (see [Unicode Categories](http://www.unicode.org/versions/Unicode6.0.0/ch04.pdf))
and the common [CJK Unified Ideographs](http://www.unicode.org/versions/Unicode6.0.0/ch12.pdf) as defined in the version 6.0.0 of the Unicode specification.

Inspired by [unicode-slugify](https://github.com/mozilla/unicode-slugify).
Note that this slug generator is different from [node-slug](https://github.com/dodo/node-slug) which focus on translating unicode characters to english or latin equivalent.


## Quick Examples

    uslug('Быстрее и лучше!') // 'быстрее-и-лучше'
    uslug('汉语/漢語') // '汉语漢語'

    uslug('Y U NO', { lower: false })) // 'Y-U-NO'
    uslug('Y U NO', { spaces: true })) // 'y u no'
    uslug('Y-U|NO', { allowedChars: '|' })) // 'yu|no'


## Installation

    npm install uslug


## Options

### uslug(string, options)

Generate a slug for the string passed.

__Arguments__

* string - The string you want to slugify.
* options - An optional object that can contain:  
    * allowedChars: a String of chars that you want to be whitelisted. Default: '-_~'.  
    * lower: a Boolean to force to lower case the slug. Default: true.  
    * spaces: a Boolean to allow spaces. Default: false.  


## License

This project is distributed under the MIT License. See LICENSE file for more information.