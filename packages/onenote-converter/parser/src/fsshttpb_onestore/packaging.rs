use crate::fsshttpb::data::object_types::ObjectType;
use crate::fsshttpb::data::stream_object::ObjectHeader;
use crate::fsshttpb::data_element::DataElementPackage;
use crate::shared::exguid::ExGuid;
use crate::shared::guid::Guid;
use parser_utils::Reader;
use parser_utils::errors::{ErrorKind, Result};
use parser_utils::log;
use parser_utils::parse::ParseHttpb;

/// A OneNote file packaged in FSSHTTPB format.
///
/// See [\[MS-ONESTORE\] 2.8.1]
///
/// [\[MS-ONESTORE\] 2.8.1]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/a2f046ea-109a-49c4-912d-dc2888cf0565
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct OneStorePackaging {
    pub(crate) file_type: Guid,
    pub(crate) file: Guid,
    pub(crate) legacy_file_version: Guid,
    pub(crate) file_format: Guid,
    pub(crate) storage_index: ExGuid,
    pub(crate) cell_schema: Guid,
    pub(crate) data_element_package: DataElementPackage,
}

impl OneStorePackaging {
    pub(crate) fn parse(reader: Reader) -> Result<OneStorePackaging> {
        let file_type = Guid::parse(reader)?;
        let file = Guid::parse(reader)?;
        let legacy_file_version = Guid::parse(reader)?;
        let file_format = Guid::parse(reader)?;

        if file_format == Guid::from_str("109ADD3F-911B-49F5-A5D0-1791EDC8AED8").unwrap() {
            // Matches the file format specified in MS-ONESTORE section 2.3
            return Err(
                ErrorKind::NotFssHttpBData(
                    "This parser only supports notebooks that have been shared then downloaded from OneDrive.".into()
                ).into(),
            );
        } else if file == legacy_file_version {
            // Matches the file format specified in MS-ONESTORE section 2.8
            log!("File matches the alternative packaging format");
        } else {
            return Err(parser_error!(
                MalformedOneStoreData,
                "not a valid OneStore file. Expected {} == {}. Format: {}",
                file,
                legacy_file_version,
                file_format,
            )
            .into());
        }

        if reader.get_u32()? != 0 {
            return Err(ErrorKind::MalformedFssHttpBData("invalid padding data".into()).into());
        }

        ObjectHeader::try_parse_32(reader, ObjectType::OneNotePackaging)?;

        let storage_index = <ExGuid as ParseHttpb>::parse(reader)?;
        let cell_schema = Guid::parse(reader)?;

        let data_element_package = DataElementPackage::parse(reader)?;

        ObjectHeader::try_parse_end_16(reader, ObjectType::OneNotePackaging)?;

        Ok(OneStorePackaging {
            file_type,
            file,
            legacy_file_version,
            file_format,
            storage_index,
            cell_schema,
            data_element_package,
        })
    }
}
