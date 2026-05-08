use parser_utils::{Reader, Result, parse::Parse};

use crate::shared::{compact_id::CompactId, jcid::JcId};

/// See [\[MS-ONESTORE\] 2.16.15](https://learn.microsoft.com/en-us/openspecs/office_file_formats/ms-onestore/b04f1a51-6e1b-496d-8921-da27d7fb8a3f)
#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ObjectDeclarationWithRefCountBody {
    pub oid: CompactId,
    /// The index of the JcId field. Documented as "MUST be 0x01"
    jci: u32,
    /// Whether encrypted
    _odcs: u32,
}

impl ObjectDeclarationWithRefCountBody {
    pub fn jcid(&self, has_prop_set: bool) -> JcId {
        if has_prop_set {
            // Set "IsPropertySet" (bit 18) to 1. See [MS-ONESTORE 2.6.14].
            JcId(self.jci | 0x20000)
        } else {
            JcId(self.jci)
        }
    }
}

impl Parse for ObjectDeclarationWithRefCountBody {
    fn parse(reader: Reader) -> Result<Self> {
        let oid = CompactId::parse(reader)?;
        let data = reader.get_u32()?;
        let jci = data & 0x3FF; // First 10 bits

        // Per the documentation, "MUST be 0x01".
        if jci != 0x1 {
            return Err(onestore_parse_error!("Non-zero jci field. Was {}", jci).into());
        }

        let odcs = (data >> 10) & 0xF; // Next 4 bits
        if odcs != 0x0 {
            return Err(onestore_parse_error!(
                "'odcs' is {:#0x}. This object may be encrypted or corrupt.",
                odcs
            )
            .into());
        }

        // The next two bytes are reserved
        reader.advance(2)?;

        Ok(Self {
            oid,
            jci,
            _odcs: odcs,
        })
    }
}
