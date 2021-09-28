# HTMLPACK

Pack an HTML and all its JavaScript, CSS, image, fonts, and external files into a single HTML file. JavaScript and CSS is embedded in STYLE and SCRIPT tags, while all other files and images are converted to dataUri format and embedded in the document.

## Usage

```javascript
import htmlpack from '@joplin/htmlpack';
htmlpack('/path/to/input.html', '/path/to/output.html');
```

## Notes

- The script works in synchronous way so it will block the calling process while running.
- No security check on what's included.

## License

MIT
