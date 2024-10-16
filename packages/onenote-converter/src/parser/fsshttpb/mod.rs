//! The FSSHTTP binary packaging format.
//!
//! This is the lowest level of the OneNote file format as the FSSHTTPB format specifies how
//! objects and revisions are stored in a binary file.
//!
//! See [\[MS-FSSHTTPB\]]
//!
//! [\[MS-FSSHTTPB\]]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/f59fc37d-2232-4b14-baac-25f98e9e7b5a

pub(crate) mod data;
pub(crate) mod data_element;
pub(crate) mod packaging;
