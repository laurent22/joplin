use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use crate::shared::file_data_ref::FileBlob;
use parser_utils::errors::Result;

/// A picture container.
///
/// See [\[MS-ONE\] 2.2.36].
///
/// [\[MS-ONE\] 2.2.36]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/28112f88-80f5-49b2-8988-d4a66dcc4d80
#[derive(Debug)]
pub(crate) struct Data {
    pub(crate) data: FileBlob,
    pub(crate) extension: Option<String>,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::PictureContainer.as_jcid()
        && object.id() != PropertySetId::XpsContainer.as_jcid()
    {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let data = object
        .file_data
        .clone()
        .map(|v| v.load())
        .transpose()?
        .unwrap_or_default();
    let extension = simple::parse_string(PropertyType::PictureFileExtension, object)?;

    Ok(Data { data, extension })
}
