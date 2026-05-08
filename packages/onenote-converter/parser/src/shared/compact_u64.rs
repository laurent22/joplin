use parser_utils::Reader;
use parser_utils::errors::Result;

/// A compact unsigned 64-bit integer.
///
/// The first byte encodes the total width of the integer. If the first byte is zero, there is no
/// further data and the integer value is zero. Otherwise the index of the lowest bit with value 1
/// of the first byte indicates the width of the remaining integer data:
/// If the lowest bit is set, the integer data is 1 byte wide; if the second bit is set, the
/// integer data is 2 bytes wide etc.   
///
/// See [\[MS-FSSHTTPB\] 2.2.1.1].
///
/// [\[MS-FSSHTTPB\] 2.2.1.1]: https://docs.microsoft.com/en-us/openspecs/sharepoint_protocols/ms-fsshttpb/8eb74ebe-81d1-4569-a29a-308a6128a52f
#[derive(Debug)]
pub(crate) struct CompactU64(u64);

impl CompactU64 {
    pub(crate) fn value(&self) -> u64 {
        self.0
    }

    pub(crate) fn parse(reader: Reader) -> Result<CompactU64> {
        let first_byte = reader.get_u8()?;

        if first_byte == 0 {
            return Ok(CompactU64(0));
        }

        if first_byte & 1 != 0 {
            return Ok(CompactU64((first_byte >> 1) as u64));
        }

        if first_byte & 2 != 0 {
            let second_byte = reader.get_u8()?;
            let value = u16::from_le_bytes([first_byte, second_byte]);
            return Ok(CompactU64((value >> 2) as u64));
        }

        if first_byte & 4 != 0 {
            let bytes = reader.read(2)?;
            let value = u32::from_le_bytes([first_byte, bytes[0], bytes[1], 0]);

            return Ok(CompactU64((value >> 3) as u64));
        }

        if first_byte & 8 != 0 {
            let bytes = reader.read(3)?;
            let value = u32::from_le_bytes([first_byte, bytes[0], bytes[1], bytes[2]]);

            return Ok(CompactU64((value >> 4) as u64));
        }

        if first_byte & 16 != 0 {
            let bytes = reader.read(4)?;
            let value =
                u64::from_le_bytes([first_byte, bytes[0], bytes[1], bytes[2], bytes[3], 0, 0, 0]);

            return Ok(CompactU64(value >> 5));
        }

        if first_byte & 32 != 0 {
            let bytes = reader.read(5)?;
            let value = u64::from_le_bytes([
                first_byte, bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], 0, 0,
            ]);

            return Ok(CompactU64(value >> 6));
        }

        if first_byte & 64 != 0 {
            let bytes = reader.read(6)?;
            let value = u64::from_le_bytes([
                first_byte, bytes[0], bytes[1], bytes[2], bytes[3], bytes[4], bytes[5], 0,
            ]);

            return Ok(CompactU64(value >> 7));
        }

        if first_byte & 128 != 0 {
            return Ok(CompactU64(reader.get_u64()?));
        }

        panic!("unexpected compact u64 type: {:x}", first_byte)
    }
}

#[cfg(test)]
mod test {
    use super::CompactU64;
    use parser_utils::reader::Reader;

    #[test]
    fn should_parse_from_reader() {
        for (input, expected) in [
            // Zero case
            (vec![0u8], 0),
            // 7-bit case
            (vec![0xF], 7),
            // 14-bit case
            (vec![0xFE, 0x0], 0x3F),
            // 21-bit case
            (vec![0xd4, 0x8b, 0x10], 135546),
            // 28-bit case
            (vec![0xd8, 0x8b, 0x10, 0x10], 0x10108bd),
            // 35-bit case
            (vec![0x10, 0x8b, 0x10, 0x13, 0x10], 0x1013108b0 >> 1),
            // 42-bit case
            (vec![0x20, 0x8b, 0x10, 0x13, 0x10, 0x10], 0x101013108b0 >> 2),
            // 49-bit case
            (
                vec![0x40, 0x8b, 0x10, 0x13, 0x10, 0x10, 0x14],
                0x14101013108b0 >> 3,
            ),
            // 64-bit case
            (
                vec![0x80, 0x8b, 0x10, 0x13, 0x10, 0x10, 0x14, 0x10, 0x14],
                0x141014101013108b,
            ),
        ] {
            let test_label = format!("{input:?} should parse to 0x{expected:0x}");
            assert_eq!(
                CompactU64::parse(&mut Reader::from(&input as &[u8]))
                    .expect(&test_label)
                    .value(),
                expected,
                "{}",
                test_label,
            );
        }
    }
}
