//! The OneNote file format.
//!
//! This module implements parsing OneNote objects from a OneNote revision store (see `onestore/`).
//! It defines the types of objects we can parse along with their properties.
//!
//! See [\[MS-ONE\]]
//!
//! [\[MS-ONE\]]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/73d22548-a613-4350-8c23-07d15576be50

pub(crate) mod property;
pub(crate) mod property_set;
