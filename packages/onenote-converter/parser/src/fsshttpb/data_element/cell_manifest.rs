use crate::fsshttpb::data::object_types::ObjectType;
use crate::fsshttpb::data::stream_object::ObjectHeader;
use crate::fsshttpb::data_element::DataElement;
use crate::shared::exguid::ExGuid;
use parser_utils::Reader;
use parser_utils::errors::Result;
use parser_utils::parse::ParseHttpb;

impl DataElement {
    /// Parse a cell manifest.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.12.4]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.12.4]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/541f7f92-ee5d-407e-9ece-fb1b35832a10
    pub(crate) fn parse_cell_manifest(reader: Reader) -> Result<ExGuid> {
        ObjectHeader::try_parse_16(reader, ObjectType::CellManifest)?;

        let id = ExGuid::parse(reader)?;

        ObjectHeader::try_parse_end_8(reader, ObjectType::DataElement)?;

        Ok(id)
    }
}
