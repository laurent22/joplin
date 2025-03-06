use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// An embedded file data container.
///
/// See [\[MS-ONE\] 2.2.59].
///
/// [\[MS-ONE\] 2.2.59]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e2a23dc5-75a5-407f-b5ff-d3412379fa7b
#[derive(Debug)]
pub(crate) struct Data(pub(crate) Vec<u8>);

impl Data {
    pub(crate) fn into_value(self) -> Vec<u8> {
        self.0
    }
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::EmbeddedFileContainer.as_jcid() {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let data = object
        .file_data()
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("embedded file container has no data".into())
        })?
        .to_vec();

    Ok(Data(data))
}
