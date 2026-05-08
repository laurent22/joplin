use super::Reader;
use super::errors::Result;
pub use parser_macros::Parse;

/// Applies to `struct`s that support parsing from a binary stream.
///
/// In many cases, it is possible to auto-derive implementations for this trait. For example,
/// ```
/// use parser_utils::parse::Parse;
///
/// #[derive(Parse)]
/// #[validate(a > 3)]
/// struct Example {
///     a: u32,
///     b: u8,
/// }
/// ```
pub trait Parse
where
    Self: Sized,
{
    fn parse(reader: Reader) -> Result<Self>;
}

/// An alternate `Parse` implementation specific to the FSSHTTPB OneNote packaging.
/// Use this if a `struct` needs to be parsed in a different way in FSSHTTPB documents.
pub trait ParseHttpb
where
    Self: Sized,
{
    fn parse(reader: Reader) -> Result<Self>;
}

pub trait ParseWithCount
where
    Self: Sized,
{
    fn parse(reader: Reader, count: usize) -> Result<Self>;
}

impl Parse for u8 {
    fn parse(reader: Reader) -> Result<Self> {
        reader.get_u8()
    }
}

impl Parse for u16 {
    fn parse(reader: Reader) -> Result<Self> {
        reader.get_u16()
    }
}

impl Parse for u32 {
    fn parse(reader: Reader) -> Result<Self> {
        reader.get_u32()
    }
}

impl Parse for u64 {
    fn parse(reader: Reader) -> Result<Self> {
        reader.get_u64()
    }
}

impl Parse for u128 {
    fn parse(reader: Reader) -> Result<Self> {
        reader.get_u128()
    }
}

impl Parse for f32 {
    fn parse(reader: Reader) -> Result<Self> {
        reader.get_f32()
    }
}

impl Parse for () {
    fn parse(_reader: Reader) -> Result<Self> {
        Ok(())
    }
}

impl<T: Parse> ParseWithCount for Vec<T> {
    fn parse(reader: Reader, size: usize) -> Result<Self> {
        let mut result = Vec::new();
        for _i in 0..size {
            result.push(T::parse(reader)?);
        }
        Ok(result)
    }
}
