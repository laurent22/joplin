use crate::{
    FileHandle,
    errors::{ErrorKind, Result},
};
use bytes::Buf;
use paste::paste;
use std::{
    cell::RefCell,
    io::{Cursor, Read, Seek, SeekFrom},
    mem,
    rc::Rc,
};

macro_rules! try_get {
    ($this:ident, $typ:tt) => {{
        if $this.remaining() < mem::size_of::<$typ>() as u64 {
            Err(ErrorKind::UnexpectedEof(format!("Getting {:}", stringify!($typ)).into()).into())
        } else {
            let mut buff = [0; mem::size_of::<$typ>()];
            $this.read_exact(&mut buff)?;

            let mut buff_ref: &[u8] = &mut buff;
            Ok(paste! {buff_ref. [< get_ $typ >]()})
        }
    }};

    ($this:ident, $typ:tt::$endian:tt) => {{
        if $this.remaining() < mem::size_of::<$typ>() as u64 {
            Err(ErrorKind::UnexpectedEof(
                format!("Getting {:} ({:})", stringify!($typ), stringify!($endian)).into(),
            )
            .into())
        } else {
            let mut buff = [0; mem::size_of::<$typ>()];
            $this.read_exact(&mut buff)?;

            let mut buff_ref: &[u8] = &mut buff;
            Ok(paste! {buff_ref. [< get_ $typ _ $endian >]()})
        }
    }};
}

type ReaderFileHandle = Rc<RefCell<Box<dyn FileHandle>>>;

enum ReaderData<'a> {
    /// Wraps a buffer owned by calling logic. This is more efficient for
    /// small amounts of data.
    BufferRef { buffer: &'a [u8] },

    /// Wraps a handle to a file. This handles large amounts of data
    /// that won't necessarily fit into memory.
    /// Invariant: The internal file handle's offset should match the
    /// `data_offset` of the main reader.
    File(ReaderFileHandle),
}

pub struct Reader<'a> {
    data: ReaderData<'a>,
    data_len: u64,
    data_offset: u64,
}

pub struct ReaderOffset(u64);

impl<'a> Seek for Reader<'a> {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> {
        let new_offset = match pos {
            SeekFrom::Start(n) => n as i64,
            SeekFrom::Current(n) => self.data_offset as i64 + n,
            SeekFrom::End(n) => (self.data_len as i64) + n,
        };

        if new_offset < 0 || new_offset as u64 > self.data_len {
            Err(std::io::Error::new(
                std::io::ErrorKind::UnexpectedEof,
                format!(
                    "New offset {} is out-of-bounds (data length: {}).",
                    new_offset, self.data_len
                ),
            ))
        } else {
            self.data_offset = new_offset as u64;

            // Sync the internal file with the new offset. This is done rather than seek the file
            // directly to avoid inconsistency if e.g. the file resizes and we're seeking from the end.
            if let ReaderData::File(f) = &mut self.data {
                f.borrow_mut().seek(SeekFrom::Start(self.data_offset))?;
            }

            Ok(self.data_offset)
        }
    }
}

impl<'a> Reader<'a> {
    pub fn new(buffer: &'a [u8]) -> Self {
        Reader {
            data_len: buffer.len() as u64,
            data_offset: 0,
            data: ReaderData::BufferRef { buffer },
        }
    }

    pub fn read(&mut self, count: usize) -> Result<Vec<u8>> {
        let mut buff = vec![0; count];
        self.read_exact(&mut buff)?;
        Ok(buff)
    }

    fn read_exact(&mut self, output: &mut [u8]) -> Result<()> {
        let count = output.len();
        if self.remaining() < count as u64 {
            return Err(
                ErrorKind::UnexpectedEof("Unexpected EOF (Reader.read_exact)".into()).into(),
            );
        }

        match &mut self.data {
            ReaderData::BufferRef { buffer } => {
                let start = self.data_offset as usize;
                (&buffer[start..start + count]).copy_to_slice(output);
            }
            ReaderData::File(file) => {
                file.borrow_mut().read_exact(output)?;
            }
        };
        self.data_offset += count as u64;

        Ok(())
    }

    pub fn peek_u8(&mut self) -> Result<Option<u8>> {
        match &mut self.data {
            ReaderData::BufferRef { buffer, .. } => {
                Ok(buffer.get(self.data_offset as usize).copied())
            }
            ReaderData::File(file) => {
                let mut file = file.borrow_mut();
                let mut buf = [0u8];
                let read_result = file.read(&mut buf);
                // Reset the original position
                file.seek(SeekFrom::Start(self.data_offset))?;

                match read_result {
                    Ok(size) => Ok(if size < 1 { None } else { Some(buf[0]) }),
                    Err(error) => Err(error)?,
                }
            }
        }
    }

    pub fn as_data_ref(&mut self, size: usize) -> Result<ReaderDataRef> {
        if self.remaining() < size as u64 {
            return Err(
                ErrorKind::UnexpectedEof("Unexpected EOF (Reader.as_data_ref)".into()).into(),
            );
        }

        match &mut self.data {
            ReaderData::BufferRef { buffer } => {
                let start = self.data_offset as usize;
                // Cloning needs to be done early with BufferRef, since we don't own the original
                // data. Large data should generally use `ReaderData::File`.
                Ok(ReaderDataRef::Vec(buffer[start..start + size].to_vec()))
            }
            ReaderData::File(file) => Ok(ReaderDataRef::FilePointer(ReaderFilePointer {
                file: file.clone(),
                start_offset: self.data_offset,
                end_offset: self.data_offset + (size as u64),
            })),
        }
    }

    pub fn remaining(&self) -> u64 {
        assert!(self.data_len >= self.data_offset);
        self.data_len - self.data_offset
    }

    pub fn advance(&mut self, count: u64) -> Result<()> {
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

        assert!(count < i64::MAX as u64);
        self.seek(SeekFrom::Current(count as i64))?;

        Ok(())
    }

    pub fn save_position(&self) -> ReaderOffset {
        ReaderOffset(self.data_offset)
    }

    pub fn restore_position(&mut self, offset: ReaderOffset) -> Result<()> {
        self.seek(SeekFrom::Start(offset.0))?;
        Ok(())
    }

    pub fn offset(&self) -> u64 {
        self.data_offset
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

impl<'a> TryFrom<Box<dyn FileHandle>> for Reader<'a> {
    type Error = crate::errors::Error;

    fn try_from(mut handle: Box<dyn FileHandle>) -> Result<Self> {
        let initial_offset = handle.seek(SeekFrom::Current(0))?;
        Ok(Self {
            data_len: handle.byte_length(),
            data_offset: initial_offset,
            data: ReaderData::File(Rc::new(RefCell::new(handle))),
        })
    }
}

impl<'a> From<&'a [u8]> for Reader<'a> {
    fn from(value: &'a [u8]) -> Self {
        Self {
            data_len: value.len() as u64,
            data_offset: 0,
            data: ReaderData::BufferRef { buffer: value },
        }
    }
}

pub enum ReaderDataRef {
    Vec(Vec<u8>),
    FilePointer(ReaderFilePointer),
}

impl ReaderDataRef {
    pub fn read(&self) -> Box<dyn Read> {
        match self {
            ReaderDataRef::Vec(slice) => Box::new(Cursor::new(slice.to_vec())),
            ReaderDataRef::FilePointer(ptr) => Box::new(ptr.clone()),
        }
    }
}

#[derive(Clone)]
pub struct ReaderFilePointer {
    file: ReaderFileHandle,
    start_offset: u64,
    end_offset: u64,
}

impl Read for ReaderFilePointer {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> {
        let offset = self.start_offset;
        if offset >= self.end_offset {
            return Ok(0);
        }

        // Don't read past the end of the region:
        let remaining = self.end_offset - offset;
        let maximum_buf_len = buf.len().min(remaining as usize);
        let buf = &mut buf[0..maximum_buf_len];

        let mut file = self.file.borrow_mut();
        let original_offset = file.seek(SeekFrom::Current(0))?;
        let read_result = (|| {
            file.seek(SeekFrom::Start(offset))?;

            file.read(buf)
        })();
        file.seek(SeekFrom::Start(original_offset))?;

        match read_result {
            Ok(size) => {
                self.start_offset += size as u64;
                Ok(size)
            }
            Err(err) => Err(err),
        }
    }
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn with_start_index_should_seek() {
        let data: [u8; 8] = [1, 2, 3, 4, 5, 6, 7, 8];
        let mut reader = Reader::from(&data as &[u8]);
        assert_eq!(reader.get_u8().unwrap(), 1);
        assert_eq!(reader.get_u8().unwrap(), 2);
        assert_eq!(reader.get_u8().unwrap(), 3);
        reader.seek(SeekFrom::Start(0)).unwrap();
        assert_eq!(reader.get_u8().unwrap(), 1);
        assert_eq!(reader.get_u8().unwrap(), 2);
        assert_eq!(reader.get_u8().unwrap(), 3);
        assert_eq!(reader.get_u8().unwrap(), 4);

        reader.seek_relative(-3).unwrap();
        assert_eq!(reader.get_u8().unwrap(), 2);
        assert_eq!(reader.get_u8().unwrap(), 3);

        reader.seek_relative(-2).unwrap();
        assert_eq!(reader.get_u8().unwrap(), 2);
        assert_eq!(reader.get_u8().unwrap(), 3);
        assert_eq!(reader.get_u8().unwrap(), 4);
    }

    #[test]
    fn should_read_from_offset() {
        let data: [u8; 8] = [1, 2, 3, 4, 5, 6, 7, 8];
        let mut reader = Reader::from(&data as &[u8]);

        reader.advance(1).unwrap();
        let mut data_ref = reader.as_data_ref(4).unwrap().read();

        reader.advance(2).unwrap();

        // The data_ref should read from the offset from where it was created
        let mut output = vec![];
        data_ref.read_to_end(&mut output).unwrap();
        assert_eq!(output, [2, 3, 4, 5]);

        // Reading the data_ref should not affect the original reader
        assert_eq!(reader.get_u8().unwrap(), 4);
    }
}
