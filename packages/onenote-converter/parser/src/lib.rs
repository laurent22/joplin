//! A OneNote file parser.

#![warn(missing_docs)]
#![deny(unused_must_use)]
mod fsshttpb;
#[macro_use]
mod macros;
mod fsshttpb_onestore;
mod local_onestore;
mod one;
mod onenote;
mod onestore;
mod shared;
mod utils;

pub use onenote::Parser;

/// The data that represents a OneNote notebook.
pub mod notebook {
    pub use crate::onenote::notebook::Notebook;
}

/// The data that represents a OneNote section.
pub mod section {
    pub use crate::onenote::section::{Section, SectionEntry};
}

/// The data that represents a OneNote page.
pub mod page {
    pub use crate::onenote::page::Page;
    pub use crate::onenote::page_content::PageContent;
}

/// The data that represents the contents of a OneNote section.
pub mod contents {
    pub use crate::onenote::content::Content;
    pub use crate::onenote::embedded_file::EmbeddedFile;
    pub use crate::onenote::image::Image;
    pub use crate::onenote::ink::{Ink, InkBoundingBox, InkPoint, InkStroke};
    pub use crate::onenote::list::List;
    pub use crate::onenote::note_tag::NoteTag;
    pub use crate::onenote::outline::{Outline, OutlineElement, OutlineItem};
    pub use crate::onenote::rich_text::{EmbeddedObject, RichText};
    pub use crate::onenote::table::{Table, TableCell};
}

/// Collection of properties used by the OneNote file format.
pub mod property {
    /// Properties related to multiple types of objects.
    pub mod common {
        pub use crate::one::property::color::Color;
        pub use crate::one::property::color_ref::ColorRef;
    }

    /// Properties related to embedded files.
    pub mod embedded_file {
        pub use crate::one::property::file_type::FileType;
    }

    /// Properties related to note tags.
    pub mod note_tag {
        pub use crate::one::property::note_tag::ActionItemStatus;
        pub use crate::one::property::note_tag_shape::NoteTagShape;
    }

    /// Properties related to rich-text content.
    pub mod rich_text {
        pub use crate::one::property::paragraph_alignment::ParagraphAlignment;
        pub use crate::onenote::rich_text::ParagraphStyling;
        pub use crate::onenote::text_region::Hyperlink;
        pub use crate::onenote::text_region::MathExpression;
        pub use crate::onenote::text_region::TextRegion;
    }
}
