use parser_utils::Reader;
use parser_utils::errors::Result;
use parser_utils::parse::{Parse, ParseHttpb};
use std::fmt;
use std::ops::BitXor;
use uuid::Uuid;

/// A global UUID.
///
/// Microsoft is using weird mixed endianness in their GUIDs which we have to consider when
/// parsing a GUID from a stream of bytes.
///
/// See also [\[1\]] and [\[2\]].
///
/// [\[1\]]: https://stackoverflow.com/questions/10190817/guid-byte-order-in-net
/// [\[2\]]: https://docs.microsoft.com/en-us/dotnet/api/system.guid.tobytearray?view=net-5.0#remarks
#[derive(Clone, Copy, PartialEq, Hash, Eq)]
pub struct Guid(pub Uuid);

impl Guid {
    pub(crate) fn from_str(value: &str) -> Result<Guid> {
        Uuid::parse_str(value).map(Guid).map_err(|e| e.into())
    }

    pub(crate) fn nil() -> Guid {
        Guid(Uuid::nil())
    }

    pub(crate) fn is_nil(&self) -> bool {
        self.0.is_nil()
    }
}

impl Parse for Guid {
    fn parse(reader: Reader) -> Result<Guid> {
        // Read as little endian
        let v = reader.get_u128()?;

        let guid = Guid(Uuid::from_bytes([
            // Big Endian
            (v >> 24) as u8,
            (v >> 16) as u8,
            (v >> 8) as u8,
            v as u8,
            // Big Endian
            (v >> 40) as u8,
            (v >> 32) as u8,
            // Big Endian
            (v >> 56) as u8,
            (v >> 48) as u8,
            // Little Endian
            (v >> 64) as u8,
            (v >> 72) as u8,
            (v >> 80) as u8,
            (v >> 88) as u8,
            (v >> 96) as u8,
            (v >> 104) as u8,
            (v >> 112) as u8,
            (v >> 120) as u8,
        ]));

        Ok(guid)
    }
}

impl ParseHttpb for Guid {
    fn parse(reader: Reader) -> Result<Self> {
        <Guid as Parse>::parse(reader)
    }
}

impl fmt::Display for Guid {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{{{:X}}}", self.0)
    }
}

impl fmt::Debug for Guid {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Guid {}", self)
    }
}

impl BitXor for Guid {
    type Output = Self;
    fn bitxor(self, rhs: Self) -> Self::Output {
        let (high_bits_1, low_bits_1) = self.0.as_u64_pair();
        let (high_bits_2, low_bits_2) = rhs.0.as_u64_pair();
        let high_bits = high_bits_1 ^ high_bits_2;
        let low_bits = low_bits_1 ^ low_bits_2;
        Self(Uuid::from_u64_pair(high_bits, low_bits))
    }
}

#[cfg(test)]
mod test {
    use super::Guid;

    #[test]
    fn should_support_xor() {
        let zeros = Guid::from_str("{00000000-0000-0000-0000-000000000000}").unwrap();
        let nonzero = Guid::from_str("{10100300-0400-0500-0600-008000900A00}").unwrap();
        assert_eq!(zeros ^ nonzero, nonzero,);
    }
}
