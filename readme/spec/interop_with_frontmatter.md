# Markdown with Front Matter Exporter/Importer

This exporter/importer is built around the MD exporter/importer. It functions identically, but includes a block of YAML front matter that contains note metadata.

YAML front matter is represented simply as a block of YAML between `---` delimiters. An illustrative example can be seen below.

```
---
title: Joplin Interop
created: 1970-01-01 00:00Z
tags:
  - export
  - import
---
```

## Supported Metadata Fields

All of the below fields are supported by both the exporter and the importer.

- `title`: Title of the note
- `updated`: Time of last not update (corresponds to `user_updated_time`)
- `created`: Creation time of note (corresponds to `user_created_time`)
- `source`: The source URL for a note that comes from the web clipper
- `author`: Author's name
- `latitude`: Latitude where note was created
- `longitude`: Longitude where note was created
- `altitude`: Altitude where note was created
- `completed?`: Exists if the note is a todo, indicates if the todo is completed
- `due`: Exists if the note is a todo, due date (alarm time) of note
- `tags`: List of all associated tag names

### Exporter

The exporter will export all the above fields that hold values in the database. So `due` and `completed?` will only be included for "todo" notesm `tags` will only exist for notes that include tags, etc.

### Importer

The importer will import the metadata corresponding to all of the above fields. Missing data will be filled in as if the note was just created. Extra fields will be ignored.

There are other tools that use similar YAML front matter blocks, notably [pandoc](https://pandoc.org/MANUAL.html#extension-yaml_metadata_block) and [r-markdown](https://github.com/hao203/rmarkdown-YAML). The importer attempts to provide compatibility with these formats where possible.

## Dates
### Exporter

All dates are exported in the ISO 8601 format (substituting the 'T' for a space based on RFC 3339 for readability) in the UTC time zone.

e.g. `1970-01-01 00:00:00Z`

### Importer

The importer is more flexible with dates. It will handle ISO 8601 dates with or without a timezone, if no timezone is specified, local time will be used. If there is a timezone specified (Z notation or +00:00 notation) that timezone will be used. If the format is not ISO 8601, the importer will attempt to read based on the users configured date and time preferences (Tools -> Options -> General or Joplin -> Preferences -> General). The importer will fallback on the Javascript [Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date) functionality if the format can not be read.

## Examples

Below are a collection of examples that represent valid notes that may have been exported by the exporter, and can be imported by the importer.

```
---
title: Frogs
source: https://en.wikipedia.org/wiki/Frog
created: 2021-05-01 16:40:00Z
updated: 2021-05-01 16:40:00Z
tags:
  - Reference
  - Cool
---

This article is about the group of amphibians. For other uses, see [Frog (disambiguation)](https://en.wikipedia.org/wiki/Frog_%28disambiguation%29 "Frog (disambiguation)").
...
```

```
---
title: Take Home Quiz
created: 2021-05-01 16:40:00Z
updated: 2021-06-17 23:59:00Z
tags:
  - school
  - math
  - homework
completed?: no
due: 2021-06-18 08:00:00Z
---

**Prove or give a counter-example of the following statement:**

> In three space dimensions and time, given an initial velocity field, there exists a vector velocity and a scalar pressure field, which are both smooth and globally defined, that solve the Navier–Stokes equations.
```

```
---
title: All Fields
updated: 2019-05-01 16:54:00Z
created: 2019-05-01 16:54:00Z
source: https://joplinapp.org
author: Joplin
latitude: 37.084021
longitude: -94.51350100
altitude: 0.0000
completed?: no
due: 2021-08-22 00:00:00Z
tags:
  - joplin
  - note
  - pencil
---

All of this metadata is available to be imported/exported.
```
