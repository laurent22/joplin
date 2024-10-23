use crate::parser::errors::{ErrorKind, Result};
use crate::parser::onestore::types::prop_set::PropertySet;
use crate::parser::Reader;
use std::convert::TryFrom;
use std::fmt;

/// A property value.
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub(crate) enum PropertyValue {
    Empty,
    Bool(bool),
    U8(u8),
    U16(u16),
    U32(u32),
    U64(u64),
    Vec(Vec<u8>),
    ObjectId,
    ObjectIds(u32),
    ObjectSpaceId,
    ObjectSpaceIds(u32),
    ContextId,
    ContextIds(u32),
    PropertyValues(PropertyId, Vec<PropertySet>),
    PropertySet(PropertySet),
}

impl TryFrom<&PropertyValue> for u8 {
    type Error = &'static str;

    fn try_from(value: &PropertyValue) -> std::result::Result<u8, Self::Error> {
        match value.to_u8() {
            Some(val) => Ok(val),
            None => {
                let val = value.to_u32().ok_or("Conversion error")?;
                Ok(u8::try_from(val).map_err(|_| "Conversion error")?)
            }
        }
    }
}

impl PropertyValue {
    pub(crate) fn to_bool(&self) -> Option<bool> {
        if let Self::Bool(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    pub(crate) fn to_u8(&self) -> Option<u8> {
        if let Self::U8(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    pub(crate) fn try_to_u8(&self) -> Option<u8> {
        u8::try_from(self).ok()
    }

    pub(crate) fn to_u16(&self) -> Option<u16> {
        if let Self::U16(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    pub(crate) fn to_u32(&self) -> Option<u32> {
        if let Self::U32(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    pub(crate) fn to_u64(&self) -> Option<u64> {
        if let Self::U64(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    pub(crate) fn to_vec(&self) -> Option<&[u8]> {
        if let Self::Vec(v) = self {
            Some(v)
        } else {
            None
        }
    }

    pub(crate) fn to_object_id(&self) -> Option<()> {
        if let Self::ObjectId = self {
            Some(())
        } else {
            None
        }
    }

    pub(crate) fn to_object_ids(&self) -> Option<u32> {
        if let Self::ObjectIds(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    pub(crate) fn to_object_space_ids(&self) -> Option<u32> {
        if let Self::ObjectSpaceIds(v) = self {
            Some(*v)
        } else {
            None
        }
    }

    pub(crate) fn to_property_values(&self) -> Option<(PropertyId, &[PropertySet])> {
        if let Self::PropertyValues(id, values) = self {
            Some((*id, values))
        } else {
            None
        }
    }
    //
    // pub(crate) fn to_property_set(&self) -> Option<&PropertySet> {
    //     if let Self::PropertySet(props) = self {
    //         Some(props)
    //     } else {
    //         None
    //     }
    // }

    pub(crate) fn parse(property_id: PropertyId, reader: Reader) -> Result<PropertyValue> {
        let prop_type = property_id.prop_type();

        let value = match prop_type {
            0x1 => PropertyValue::Empty,
            0x2 => PropertyValue::Bool(property_id.bool()),
            0x3 => PropertyValue::U8(reader.get_u8()?),
            0x4 => PropertyValue::U16(reader.get_u16()?),
            0x5 => PropertyValue::U32(reader.get_u32()?),
            0x6 => PropertyValue::U64(reader.get_u64()?),
            0x7 => PropertyValue::parse_vec(reader)?,

            0x8 => PropertyValue::ObjectId,
            0x9 => PropertyValue::ObjectIds(reader.get_u32()?),

            0xA => PropertyValue::ObjectSpaceId,
            0xB => PropertyValue::ObjectSpaceIds(reader.get_u32()?),

            0xC => PropertyValue::ContextId,
            0xD => PropertyValue::ContextIds(reader.get_u32()?),

            0x10 => PropertyValue::parse_property_values(reader)?,
            0x11 => PropertyValue::PropertySet(PropertySet::parse(reader)?),

            v => {
                return Err(ErrorKind::MalformedOneStoreData(
                    format!("unexpected property type: 0x{:x}", v).into(),
                )
                .into())
            }
        };

        Ok(value)
    }

    fn parse_vec(reader: Reader) -> Result<PropertyValue> {
        let size = reader.get_u32()?;
        let data = reader.read(size as usize)?.to_vec();

        Ok(PropertyValue::Vec(data))
    }

    fn parse_property_values(reader: Reader) -> Result<PropertyValue> {
        let size = reader.get_u32()?;

        // Parse property ID

        let id = PropertyId::parse(reader)?;

        // Parse property values

        let values = (0..size)
            .map(|_| PropertySet::parse(reader))
            .collect::<Result<_>>()?;

        Ok(PropertyValue::PropertyValues(id, values))
    }
}

/// A property ID.
///
/// See [\[MS-ONESTORE\] 2.6.6].
///
/// [\[MS-ONESTORE\] 2.6.6]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/17d8c39e-6cc2-4fcd-8d10-aee950fd0ab2
#[derive(Copy, Clone, Hash, Eq, PartialEq)]
pub(crate) struct PropertyId(u32);

impl PropertyId {
    pub(crate) fn new(value: u32) -> PropertyId {
        PropertyId(value)
    }

    pub(crate) fn value(&self) -> u32 {
        self.0
    }

    pub(crate) fn id(&self) -> u32 {
        self.0 & 0x3ffffff
    }

    pub(crate) fn prop_type(&self) -> u32 {
        self.0 >> 26 & 0x1f
    }

    pub(crate) fn bool(&self) -> bool {
        self.0 >> 31 == 1
    }

    pub(crate) fn parse(reader: Reader) -> Result<PropertyId> {
        reader.get_u32().map(PropertyId::new)
    }
}

impl fmt::Debug for PropertyId {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "PropertyId(0x{:08X})", self.0)
    }
}

#[cfg(test)]
mod test {
    use crate::parser::onestore::types::property::PropertyId;

    #[test]
    fn test_property_bool() {
        assert_eq!(PropertyId::new(0x08001C04).bool(), false);
        assert_eq!(PropertyId::new(0x88001C04).bool(), true);
        assert_eq!(PropertyId::new(0x88001C04).id(), 0x1C04);
        assert_eq!(PropertyId::new(0x88001C04).prop_type(), 0x2);
    }
}
