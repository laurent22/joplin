use crate::parser::errors::Result;
use crate::parser::shared::guid::Guid;
use crate::parser::Reader;

/// A variable-width serial number.
///
/// See [\[MS-FSSHTTPB\] 2.2.1.9].
///
/// [\[MS-FSSHTTPB\] 2.2.1.9]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/9db15fa4-0dc2-4b17-b091-d33886d8a0f6
#[derive(Debug)]
#[allow(dead_code)]
pub struct SerialNumber {
    pub guid: Guid,
    pub serial: u64,
}

impl SerialNumber {
    pub(crate) fn parse(reader: Reader) -> Result<SerialNumber> {
        let serial_type = reader.get_u8()?;

        // A null-value ([FSSHTTPB] 2.2.1.9.1)
        if serial_type == 0 {
            return Ok(SerialNumber {
                guid: Guid::nil(),
                serial: 0,
            });
        }

        // A serial number with a 64 bit value ([FSSHTTPB] 2.2.1.9.2)
        let guid = Guid::parse(reader)?;
        let serial = reader.get_u64()?;

        Ok(SerialNumber { guid, serial })
    }
}
