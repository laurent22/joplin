use crate::parser::errors::{ErrorKind, Result};
use crate::parser::one::property::PropertyType;
use crate::parser::onestore::object::Object;

/// A 32 bit date/time timestamp.
///
/// See [\[MS-ONE\] 2.3.1]
///
/// [\[MS-ONE\] 2.3.1]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/82336580-f956-40ea-94ab-d9ab15048395
#[derive(Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Debug)]
pub struct Time(u32);

impl Time {
    pub(crate) fn parse(prop_type: PropertyType, object: &Object) -> Result<Option<Time>> {
        let time = object
            .props()
            .get(prop_type)
            .map(|value| {
                value.to_u32().ok_or_else(|| {
                    ErrorKind::MalformedOneNoteFileData("time value is not a u32".into())
                })
            })
            .transpose()?
            .map(Time);

        Ok(time)
    }
}

/// A 64 bit date/time timestamp.
///
/// See [\[MS-DTYP\] 2.3.3]
///
/// [\[MS-DTYP\] 2.3.3]: https://docs.microsoft.com/en-us/openspecs/windows_protocols/ms-dtyp/2c57429b-fdd4-488f-b5fc-9e4cf020fcdf
#[derive(Debug)]
#[allow(dead_code)]
pub(crate) struct Timestamp(u64);

impl Timestamp {
    pub(crate) fn parse(prop_type: PropertyType, object: &Object) -> Result<Option<Timestamp>> {
        let timestamp = object
            .props()
            .get(prop_type)
            .map(|value| {
                value.to_u64().ok_or_else(|| {
                    ErrorKind::MalformedOneNoteFileData("timestamp value is not a u64".into())
                })
            })
            .transpose()?
            .map(Timestamp);

        Ok(timestamp)
    }
}
