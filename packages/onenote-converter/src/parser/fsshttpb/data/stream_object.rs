use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::compact_u64::CompactU64;
use crate::parser::fsshttpb::data::object_types::ObjectType;
use crate::parser::Reader;
use num_traits::{FromPrimitive, ToPrimitive};

/// A FSSHTTPB stream object header.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.5].
///
/// [\[MS-FSSHTTPB\] 2.2.1.5]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/5faee10f-8e55-43f8-935a-d6e4294856fc
#[derive(Debug)]
#[allow(dead_code)]
pub struct ObjectHeader {
    pub compound: bool,
    pub object_type: ObjectType,
    pub length: u64,
}

impl ObjectHeader {
    pub(crate) fn try_parse(reader: Reader, object_type: ObjectType) -> Result<()> {
        Self::try_parse_start(reader, object_type, Self::parse)
    }

    /// Parse a 16-bit or 32-bit stream object header.
    pub(crate) fn parse(reader: Reader) -> Result<ObjectHeader> {
        let header_type = reader.bytes().first().ok_or(ErrorKind::UnexpectedEof)?;

        match header_type & 0b11 {
            0x0 => Self::parse_16(reader),
            0x2 => Self::parse_32(reader),
            _ => Err(ErrorKind::MalformedFssHttpBData(
                format!("unexpected object header type: {:x}", header_type).into(),
            )
            .into()),
        }
    }

    pub(crate) fn try_parse_16(reader: Reader, object_type: ObjectType) -> Result<()> {
        Self::try_parse_start(reader, object_type, Self::parse_16)
    }

    /// Parse a 16 bit stream object header.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.5.1]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.5.1]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/a1017f48-a888-49ff-b71d-cc3c707f753a
    pub(crate) fn parse_16(reader: Reader) -> Result<ObjectHeader> {
        let data = reader.get_u16()?;

        let header_type = data & 0b11;
        if header_type != 0x0 {
            return Err(ErrorKind::MalformedFssHttpBData(
                format!(
                    "unexpected object header type for 16 bit header: 0x{:x}",
                    header_type
                )
                .into(),
            )
            .into());
        }

        let compound = data & 0x4 == 0x4;
        let object_type_value = (data >> 3) & 0x3f;
        let object_type = if let Some(object_type) = ObjectType::from_u16(object_type_value) {
            object_type
        } else {
            return Err(ErrorKind::MalformedFssHttpBData(
                format!("invalid object type: 0x{:x}", object_type_value).into(),
            )
            .into());
        };
        let length = (data >> 9) as u64;

        Ok(ObjectHeader {
            compound,
            object_type,
            length,
        })
    }

    pub(crate) fn try_parse_32(reader: Reader, object_type: ObjectType) -> Result<()> {
        Self::try_parse_start(reader, object_type, Self::parse_32)
    }

    /// Parse a 32 bit stream object header.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.5.2]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.5.2]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/ac629d63-60a1-49b2-9db2-fa3c19971cc9
    fn parse_32(reader: Reader) -> Result<ObjectHeader> {
        let data = reader.get_u32()?;

        let header_type = data & 0b11;
        if header_type != 0x2 {
            return Err(ErrorKind::MalformedFssHttpBData(
                format!(
                    "unexpected object header type for 32 bit header: 0x{:x}",
                    header_type
                )
                .into(),
            )
            .into());
        }

        let compound = data & 0x4 == 0x4;
        let object_type_value = (data >> 3) & 0x3fff;
        let object_type = if let Some(object_type) = ObjectType::from_u32(object_type_value) {
            object_type
        } else {
            return Err(ErrorKind::MalformedFssHttpBData(
                format!("invalid object type: 0x{:x}", object_type_value).into(),
            )
            .into());
        };
        let mut length = (data >> 17) as u64;

        if length == 0x7fff {
            length = CompactU64::parse(reader)?.value();
        }

        Ok(ObjectHeader {
            compound,
            object_type,
            length,
        })
    }

    pub(crate) fn try_parse_end_16(reader: Reader, object_type: ObjectType) -> Result<()> {
        Self::try_parse_end(reader, object_type, Self::parse_end_16)
    }

    /// Parse a 16-bit stream object header end.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.5.4]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.5.4]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/d8cedbb8-073b-4711-8867-f88b887ab0a9
    fn parse_end_16(reader: Reader) -> Result<ObjectType> {
        let data = reader.get_u16()?;
        let header_type = data & 0b11;
        if header_type != 0x3 {
            return Err(ErrorKind::MalformedFssHttpBData(
                format!(
                    "unexpected object header type for 16 bit end header: {:x}",
                    header_type
                )
                .into(),
            )
            .into());
        }

        let object_type_value = data >> 2;

        if let Some(object_type) = ObjectType::from_u16(object_type_value) {
            Ok(object_type)
        } else {
            Err(ErrorKind::MalformedFssHttpBData(
                format!("invalid object type: 0x{:x}", object_type_value).into(),
            )
            .into())
        }
    }

    pub(crate) fn try_parse_end_8(reader: Reader, object_type: ObjectType) -> Result<()> {
        Self::try_parse_end(reader, object_type, Self::parse_end_8)
    }

    /// Parse a 8-bit stream object header end.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.5.3]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.5.3]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/544ce81a-44e3-48ff-b094-0e51c7207aa1
    fn parse_end_8(reader: Reader) -> Result<ObjectType> {
        let data = reader.get_u8()?;
        let header_type = data & 0b11;
        if header_type != 0x1 {
            return Err(ErrorKind::MalformedFssHttpBData(
                format!(
                    "unexpected object header type for 8 bit end header: {:x}",
                    header_type
                )
                .into(),
            )
            .into());
        }

        let object_type_value = data >> 2;

        if let Some(object_type) = ObjectType::from_u8(object_type_value) {
            Ok(object_type)
        } else {
            Err(ErrorKind::MalformedFssHttpBData(
                format!("invalid object type: 0x{:x}", object_type_value).into(),
            )
            .into())
        }
    }

    pub(crate) fn has_end_8(reader: Reader, object_type: ObjectType) -> Result<bool> {
        let data = reader.bytes().first().ok_or(ErrorKind::UnexpectedEof)?;

        Ok(data & 0b11 == 0x1 && data >> 2 == object_type.to_u8().unwrap())
    }

    fn try_parse_start(
        reader: Reader,
        object_type: ObjectType,
        parse: fn(Reader) -> Result<ObjectHeader>,
    ) -> Result<()> {
        match parse(reader) {
            Ok(header) if header.object_type == object_type => Ok(()),
            Ok(header) => Err(ErrorKind::MalformedFssHttpBData(
                format!("unexpected object type: {:x}", header.object_type).into(),
            )
            .into()),
            Err(e) => Err(e),
        }
    }

    fn try_parse_end(
        reader: Reader,
        object_type: ObjectType,
        parse: fn(Reader) -> Result<ObjectType>,
    ) -> Result<()> {
        match parse(reader) {
            Ok(header) if header == object_type => Ok(()),
            Ok(header) => Err(ErrorKind::MalformedFssHttpBData(
                format!("unexpected object type: {:x}", header).into(),
            )
            .into()),
            Err(e) => Err(e),
        }
    }
}
