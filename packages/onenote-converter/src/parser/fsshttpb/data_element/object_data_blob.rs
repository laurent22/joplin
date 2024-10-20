use crate::parser::errors::Result;
use crate::parser::fsshttpb::data::binary_item::BinaryItem;
use crate::parser::fsshttpb::data::object_types::ObjectType;
use crate::parser::fsshttpb::data::stream_object::ObjectHeader;
use crate::parser::fsshttpb::data_element::DataElement;
use crate::parser::Reader;
use std::fmt;

/// An object data blob.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.12.8]
///
/// [\[MS-FSSHTTPB\] 2.2.1.12.8]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/d36dd2b4-bad1-441b-93c7-adbe3069152c
pub(crate) struct ObjectDataBlob(Vec<u8>);

impl ObjectDataBlob {
    pub(crate) fn value(&self) -> &[u8] {
        &self.0
    }
}

impl fmt::Debug for ObjectDataBlob {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "ObjectDataBlob({} bytes)", self.0.len())
    }
}

impl DataElement {
    pub(crate) fn parse_object_data_blob(reader: Reader) -> Result<ObjectDataBlob> {
        ObjectHeader::try_parse(reader, ObjectType::ObjectDataBlob)?;

        let data = BinaryItem::parse(reader)?;

        ObjectHeader::try_parse_end_8(reader, ObjectType::DataElement)?;

        Ok(ObjectDataBlob(data.value()))
    }
}
