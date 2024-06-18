use crate::parser::errors::{ErrorKind, Result};
use crate::parser::fsshttpb::data::compact_u64::CompactU64;
use crate::parser::shared::guid::Guid;
use crate::parser::Reader;
use std::fmt;

/// A variable-width encoding of an extended GUID (GUID + 32 bit value)
///
/// See [\[MS-FSSHTTPB\] 2.2.1.7].
///
/// [\[MS-FSSHTTPB\] 2.2.1.7]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/bff58e9f-8222-4fbb-b112-5826d5febedd
#[derive(Clone, Copy, PartialEq, Hash, Eq)]
pub struct ExGuid {
    pub guid: Guid,
    pub value: u32,
}

impl ExGuid {
    pub fn fallback() -> ExGuid {
        return ExGuid {
            guid: Guid::nil(),
            value: 0,
        };
    }

    pub(crate) fn is_nil(&self) -> bool {
        self.guid.is_nil() && self.value == 0
    }

    pub(crate) fn as_option(&self) -> Option<ExGuid> {
        if self.is_nil() {
            None
        } else {
            Some(*self)
        }
    }

    pub(crate) fn from_guid(guid: Guid, value: u32) -> ExGuid {
        ExGuid { guid, value }
    }

    pub(crate) fn parse(reader: Reader) -> Result<ExGuid> {
        let data = reader.get_u8()?;

        // A null ExGuid ([FSSHTTPB] 2.2.1.7.1)
        if data == 0 {
            return Ok(ExGuid {
                guid: Guid::nil(),
                value: 0,
            });
        }

        // A ExGuid with a 5 bit value ([FSSHTTPB] 2.2.1.7.2)
        if data & 0b111 == 4 {
            return Ok(ExGuid {
                guid: Guid::parse(reader)?,
                value: (data >> 3) as u32,
            });
        }

        // A ExGuid with a 10 bit value ([FSSHTTPB] 2.2.1.7.3)
        if data & 0b111111 == 32 {
            let value = (reader.get_u8()? as u16) << 2 | (data >> 6) as u16;

            return Ok(ExGuid {
                guid: Guid::parse(reader)?,
                value: value as u32,
            });
        }

        // A ExGuid with a 17 bit value ([FSSHTTPB] 2.2.1.7.4)
        if data & 0b1111111 == 64 {
            let value = (reader.get_u16()? as u32) << 1 | (data >> 7) as u32;

            return Ok(ExGuid {
                guid: Guid::parse(reader)?,
                value,
            });
        }

        // A ExGuid with a 32 bit value ([FSSHTTPB] 2.2.1.7.5)
        if data == 128 {
            let value = reader.get_u32()?;

            return Ok(ExGuid {
                guid: Guid::parse(reader)?,
                value,
            });
        }

        Err(
            ErrorKind::MalformedData(format!("unexpected ExGuid first byte: {:b}", data).into())
                .into(),
        )
    }

    /// Parse an array of `ExGuid` values.
    ///
    /// See [\[MS-FSSHTTPB\] 2.2.1.8]
    ///
    /// [\[MS-FSSHTTPB\] 2.2.1.8]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/10d6fb35-d630-4ae3-b530-b9e877fc27d3
    pub(crate) fn parse_array(reader: Reader) -> Result<Vec<ExGuid>> {
        let mut values = vec![];

        let count = CompactU64::parse(reader)?.value();
        for _ in 0..count {
            values.push(ExGuid::parse(reader)?);
        }

        Ok(values)
    }
}

impl fmt::Debug for ExGuid {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "ExGuid {{{}, {}}}", self.guid, self.value)
    }
}
