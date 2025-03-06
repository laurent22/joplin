use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// An embedded file's file type.
///
/// See [\[MS-ONE\] 2.3.62].
///
/// [\[MS-ONE\] 2.3.62]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/112836a0-ed3b-4be1-bc4b-49f0f7b02295
#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub enum FileType {
    /// Unknown
    Unknown,

    /// An audio file.
    Audio,

    /// A video file.
    Video,
}

impl FileType {
    pub(crate) fn parse(object: &Object) -> Result<FileType> {
        let value = match object.props().get(PropertyType::IRecordMedia) {
            Some(value) => value.to_u32().ok_or_else(|| {
                ErrorKind::MalformedOneNoteFileData("file type status is not a u32".into())
            })?,
            None => return Ok(FileType::Unknown),
        };

        let file_type = match value {
            1 => FileType::Audio,
            2 => FileType::Video,
            _ => {
                return Err(ErrorKind::MalformedOneNoteFileData(
                    format!("invalid file type: {}", value).into(),
                )
                .into())
            }
        };

        Ok(file_type)
    }
}
