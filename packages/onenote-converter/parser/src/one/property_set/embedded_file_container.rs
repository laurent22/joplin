use crate::onestore::object::Object;
use crate::{one::property_set::PropertySetId, shared::file_data_ref::FileBlob};
use parser_utils::errors::{ErrorKind, Result};

/// An embedded file data container.
///
/// See [\[MS-ONE\] 2.2.59].
///
/// [\[MS-ONE\] 2.2.59]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/e2a23dc5-75a5-407f-b5ff-d3412379fa7b
#[derive(Debug)]
pub(crate) struct Data(pub(crate) FileBlob);

impl Data {
    pub(crate) fn into_value(self) -> FileBlob {
        self.0
    }
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::EmbeddedFileContainer.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let data = object
        .file_data
        .clone()
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("embedded file container has no data".into())
        })?
        .load()?;

    Ok(Data(data))
}
