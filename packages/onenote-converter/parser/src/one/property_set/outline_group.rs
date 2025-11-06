use crate::one::property::object_reference::ObjectReference;
use crate::one::property::time::Time;
use crate::one::property::{PropertyType, simple};
use crate::one::property_set::PropertySetId;
use crate::onestore::object::Object;
use crate::shared::exguid::ExGuid;
use parser_utils::errors::{ErrorKind, Result};

/// An outline group.
///
/// See [\[MS-ONE\] 2.2.22].
///
/// [\[MS-ONE\] 2.2.22]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/7dcc1618-46ee-4912-b918-ab4df1b52315
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Data {
    pub(crate) last_modified: Time,
    pub(crate) children: Vec<ExGuid>,
    pub(crate) child_level: u8,
}

pub(crate) fn parse(object: &Object) -> Result<Data> {
    if object.id() != PropertySetId::OutlineGroup.as_jcid() {
        return Err(unexpected_object_type_error!(object.id().0).into());
    }

    let last_modified = Time::parse(PropertyType::LastModifiedTime, object)?.ok_or_else(|| {
        ErrorKind::MalformedOneNoteFileData("outline group has no last modified time".into())
    })?;
    let children =
        ObjectReference::parse_vec(PropertyType::ElementChildNodes, object)?.unwrap_or_default();
    let child_level = simple::parse_u8(PropertyType::OutlineElementChildLevel, object)?
        .ok_or_else(|| {
            ErrorKind::MalformedOneNoteFileData("outline group has no child level".into())
        })?;

    let data = Data {
        last_modified,
        children,
        child_level,
    };

    Ok(data)
}
