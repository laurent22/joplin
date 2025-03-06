use crate::parser::errors::{ErrorKind, Result};
use bytes::Buf;
use paste::paste;
use std::mem;

macro_rules! try_get {
    ($this:ident, $typ:tt) => {{
        if $this.0.remaining() < mem::size_of::<$typ>() {
            Err(ErrorKind::UnexpectedEof.into())
        } else {
            Ok(paste! {$this.0. [< get_ $typ >]()})
        }
    }};

    ($this:ident, $typ:tt::$endian:tt) => {{
        if $this.0.remaining() < mem::size_of::<$typ>() {
            Err(ErrorKind::UnexpectedEof.into())
        } else {
            Ok(paste! {$this.0. [< get_ $typ _ $endian >]()})
        }
    }};
}

pub(crate) struct Reader<'a>(&'a [u8]);

impl<'a> Reader<'a> {
    pub(crate) fn new(data: &'a [u8]) -> Reader<'a> {
        Reader(data)
    }

    pub(crate) fn read(&mut self, cnt: usize) -> Result<&[u8]> {
        if self.remaining() < cnt {
            return Err(ErrorKind::UnexpectedEof.into());
        }

        let data = &self.0[0..cnt];
        self.0.advance(cnt);

        Ok(data)
    }

    pub(crate) fn bytes(&self) -> &[u8] {
        self.0.chunk()
    }

    pub(crate) fn remaining(&self) -> usize {
        self.0.remaining()
    }

    pub(crate) fn advance(&mut self, cnt: usize) -> Result<()> {
        if self.remaining() < cnt {
            return Err(ErrorKind::UnexpectedEof.into());
        }

        self.0.advance(cnt);

        Ok(())
    }

    pub(crate) fn get_u8(&mut self) -> Result<u8> {
        try_get!(self, u8)
    }

    pub(crate) fn get_u16(&mut self) -> Result<u16> {
        try_get!(self, u16::le)
    }

    pub(crate) fn get_u32(&mut self) -> Result<u32> {
        try_get!(self, u32::le)
    }

    pub(crate) fn get_u64(&mut self) -> Result<u64> {
        try_get!(self, u64::le)
    }

    pub(crate) fn get_u128(&mut self) -> Result<u128> {
        try_get!(self, u128::le)
    }

    pub(crate) fn get_f32(&mut self) -> Result<f32> {
        try_get!(self, f32::le)
    }
}
