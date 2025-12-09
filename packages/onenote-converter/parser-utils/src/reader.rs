use crate::errors::{ErrorKind, Result};
use bytes::Buf;
use paste::paste;
use std::mem;

macro_rules! try_get {
    ($this:ident, $typ:tt) => {{
        if $this.buff.remaining() < mem::size_of::<$typ>() {
            Err(ErrorKind::UnexpectedEof(format!("Getting {:}", stringify!($typ)).into()).into())
        } else {
            Ok(paste! {$this.buff. [< get_ $typ >]()})
        }
    }};

    ($this:ident, $typ:tt::$endian:tt) => {{
        if $this.buff.remaining() < mem::size_of::<$typ>() {
            Err(ErrorKind::UnexpectedEof(
                format!("Getting {:} ({:})", stringify!($typ), stringify!($endian)).into(),
            )
            .into())
        } else {
            Ok(paste! {$this.buff. [< get_ $typ _ $endian >]()})
        }
    }};
}

pub struct Reader<'a> {
    buff: &'a [u8],
    original: &'a [u8],
}

impl<'a> Clone for Reader<'a> {
    fn clone(&self) -> Self {
        let mut result = Self::new(self.original);
        result
            .advance(self.absolute_offset())
            .expect("should re-advance to the original's position");
        result
    }
}

impl<'a> Reader<'a> {
    pub fn new(data: &'a [u8]) -> Reader<'a> {
        Reader {
            buff: data,
            original: data,
        }
    }

    pub fn read(&mut self, cnt: usize) -> Result<&'a [u8]> {
        if self.remaining() < cnt {
            return Err(ErrorKind::UnexpectedEof("Unexpected EOF (Reader.read)".into()).into());
        }

        let data = &self.buff[0..cnt];
        self.buff.advance(cnt);

        Ok(data)
    }

    pub fn bytes(&self) -> &[u8] {
        self.buff.chunk()
    }

    pub fn remaining(&self) -> usize {
        self.buff.remaining()
    }

    pub fn advance(&mut self, count: usize) -> Result<()> {
        if self.remaining() < count {
            return Err(ErrorKind::UnexpectedEof(
                format!(
                    "Reader.advance was unable to advance {} bytes. Only {} bytes are available",
                    count,
                    self.remaining(),
                )
                .into(),
            )
            .into());
        }

        self.buff.advance(count);

        Ok(())
    }

    pub fn absolute_offset(&self) -> usize {
        // Use pointer arithmetic (in a way similar to the [subslice offset](https://docs.rs/crate/subslice-offset/latest/source/src/lib.rs)
        // crate and [this StackOverflow post](https://stackoverflow.com/questions/50781561/how-to-find-the-starting-offset-of-a-string-slice-of-another-string/50781657))
        // to calculate the offset.
        let offset = (self.buff.as_ptr() as usize) - (self.original.as_ptr() as usize);
        if offset > self.original.len() {
            panic!("self.buff must be a subslice of self.original!");
        }

        offset
    }

    pub fn with_updated_bounds(&self, start: usize, end: usize) -> Result<Reader<'a>> {
        if start > self.original.len() {
            return Err(ErrorKind::UnexpectedEof(
                "Reader.with_updated_bounds: start is out of bounds".into(),
            )
            .into());
        }
        if end > self.original.len() {
            return Err(ErrorKind::UnexpectedEof(
                "Reader.with_updated_bounds: end is out of bounds".into(),
            )
            .into());
        }

        Ok(Reader {
            buff: &self.original[start..end],
            original: self.original,
        })
    }

    pub fn get_u8(&mut self) -> Result<u8> {
        try_get!(self, u8)
    }

    pub fn get_u16(&mut self) -> Result<u16> {
        try_get!(self, u16::le)
    }

    pub fn get_u32(&mut self) -> Result<u32> {
        try_get!(self, u32::le)
    }

    pub fn get_u64(&mut self) -> Result<u64> {
        try_get!(self, u64::le)
    }

    pub fn get_u128(&mut self) -> Result<u128> {
        try_get!(self, u128::le)
    }

    pub fn get_f32(&mut self) -> Result<f32> {
        try_get!(self, f32::le)
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn with_start_index_should_seek() {
        let data: [u8; 8] = [1, 2, 3, 4, 5, 6, 7, 8];
        let mut reader = Reader::new(&data);
        assert_eq!(reader.get_u8().unwrap(), 1);
        assert_eq!(reader.get_u8().unwrap(), 2);
        assert_eq!(reader.get_u8().unwrap(), 3);
        {
            let mut reader = reader.with_updated_bounds(0, 8).unwrap();
            assert_eq!(reader.get_u8().unwrap(), 1);
            assert_eq!(reader.get_u8().unwrap(), 2);
            assert_eq!(reader.get_u8().unwrap(), 3);
            assert_eq!(reader.get_u8().unwrap(), 4);
            let mut reader = reader.with_updated_bounds(1, 7).unwrap();
            assert_eq!(reader.get_u8().unwrap(), 2);
            assert_eq!(reader.get_u8().unwrap(), 3);
            let mut reader = reader.with_updated_bounds(1, 7).unwrap();
            assert_eq!(reader.get_u8().unwrap(), 2);
            assert_eq!(reader.get_u8().unwrap(), 3);
            let reader = reader.with_updated_bounds(5, 7).unwrap();
            assert_eq!(reader.remaining(), 2);
            let reader = reader.with_updated_bounds(6, 6).unwrap();
            assert_eq!(reader.remaining(), 0);
        }
        assert_eq!(reader.get_u8().unwrap(), 4);
    }
}
