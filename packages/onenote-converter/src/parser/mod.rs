//! A OneNote file parser.

#![warn(missing_docs)]
#![deny(unused_must_use)]
pub mod errors;
mod fsshttpb;
#[macro_use]
mod macros;
mod one;
mod onenote;
mod onestore;
mod reader;
mod shared;
mod utils;

pub(crate) type Reader<'a, 'b> = &'b mut crate::parser::reader::Reader<'a>;

pub use onenote::Parser;

/// The data that represents a OneNote notebook.
pub mod notebook {
    pub use crate::parser::onenote::notebook::Notebook;
}

/// The data that represents a OneNote section.
pub mod section {
    pub use crate::parser::onenote::section::{Section, SectionEntry};
}

/// The data that represents a OneNote page.
pub mod page {
    pub use crate::parser::onenote::page::Page;
    pub use crate::parser::onenote::page_content::PageContent;
}

/// The data that represents the contents of a OneNote section.
pub mod contents {
    pub use crate::parser::onenote::content::Content;
    pub use crate::parser::onenote::embedded_file::EmbeddedFile;
    pub use crate::parser::onenote::image::Image;
    pub use crate::parser::onenote::ink::{Ink, InkBoundingBox, InkPoint, InkStroke};
    pub use crate::parser::onenote::list::List;
    pub use crate::parser::onenote::note_tag::NoteTag;
    pub use crate::parser::onenote::outline::{Outline, OutlineElement, OutlineItem};
    pub use crate::parser::onenote::rich_text::{EmbeddedObject, RichText};
    pub use crate::parser::onenote::table::{Table, TableCell};
}

/// Collection of properties used by the OneNote file format.
pub mod property {
    /// Properties related to multiple types of objects.
    pub mod common {
        pub use crate::parser::one::property::color::Color;
        pub use crate::parser::one::property::color_ref::ColorRef;
    }

    /// Properties related to embedded files.
    pub mod embedded_file {
        pub use crate::parser::one::property::file_type::FileType;
    }

    /// Properties related to note tags.
    pub mod note_tag {
        pub use crate::parser::one::property::note_tag::ActionItemStatus;
        pub use crate::parser::one::property::note_tag_shape::NoteTagShape;
    }

    /// Properties related to rich-text content.
    pub mod rich_text {
        pub use crate::parser::one::property::paragraph_alignment::ParagraphAlignment;
        pub use crate::parser::onenote::rich_text::ParagraphStyling;
    }
}
