use crate::parser::errors::Result;
use crate::parser::one::property::{simple, PropertyType};
use crate::parser::onestore::object::Object;

/// The author of an object.
///
/// See [\[MS-ONE\] 2.2.67]
///
/// [\[MS-ONE\] 2.2.67]: https://docs.microsoft.com/en-us/openspecs/office_file_formats/ms-one/db06251b-b672-4c9b-8ba5-d948caaa3edd
#[derive(Debug)]
pub(crate) struct Author(String);

impl Author {
    pub(crate) fn into_value(self) -> String {
        self.0
    }

    pub(crate) fn parse(object: &Object) -> Result<Option<Author>> {
        Ok(simple::parse_string(PropertyType::Author, object)?.map(Author))
    }
}
