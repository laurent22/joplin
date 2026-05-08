1. File without extension and leading `./`: [file1](./file1). Gets imported, but filename is converted to extension, like `<internal_id>.file1`
2. File without extension: [file2](file2). Not imported at all.
3. File with extension: [file3](file3.text). Gets imported properly.
