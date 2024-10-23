use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::one::property_set::PropertySetId;
use crate::parser::onestore::object::Object;

/// A picture container.
///
/// See [\[MS-ONE\] 2.2.36].
///
/// [\[MS-ONE\] 2.2.36]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/28112f88-80f5-49b2-8988-d4a66dcc4d80
#[derive(Debug)]
pub(crate) struct Data {
    pub(crate) data: Vec<u8>,
    pub(crate) extension: Option<String>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::PictureContainer.as_jcid()
        && object.id() != PropertySetId::XpsContainer.as_jcid()
    {
        return Err(ErrorKind::MalformedOneNoteFileData(
            format!("unexpected object type: 0x{:X}", object.id().0).into(),
        )
        .into());
    }

    let data = object.file_data().map(|v| v.to_vec()).unwrap_or_default();
    let extension = simple::parse_string(PropertyType::PictureFileExtension, object)?;

    Ok(Data { data, extension })
}
