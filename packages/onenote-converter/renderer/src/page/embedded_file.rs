use crate::{page::Renderer, utils::StyleSet};
use color_eyre::Result;
use parser::contents::EmbeddedFile;
use parser::property::embedded_file::FileType;
use parser_utils::{fs_driver, log};

impl<'a> Renderer<'a> {
    pub(crate) fn render_embedded_file(&mut self, file: &EmbeddedFile) -> Result<String> {
        let content;

        let filename = self
            .section
            .to_unique_safe_filename(&self.output, file.filename())?;
        let path = fs_driver().join(&self.output, &filename);
        log!("Rendering embedded file: {:?}", path);
        fs_driver().write_file(&path, file.data())?;

        let mut styles = StyleSet::new();
        if let Some(offset_x_half_inches) = file.offset_horizontal() {
            styles.set("margin-left", format!("{}in", offset_x_half_inches / 2.));
        }
        if let Some(offset_y_half_inches) = file.offset_vertical() {
            styles.set("margin-top", format!("{}in", offset_y_half_inches / 2.));
        }

        let file_type = Self::guess_type(file);
        match file_type {
            // TODO: As of 01-06-2026, Joplin has limited or no support for <video> and <audio> elements in HTML notes.
            // For example, <video> elements can only reference web URLs and <audio> elements aren't
            // supported at all.
            //
            // See also: https://github.com/laurent22/joplin/issues/11939.
            // FileType::Audio => content = format!("<audio class=\"media-player media-audio\"controls><source src=\"{}\" type=\"audio/x-wav\"></source></audio>", filename),
            // FileType::Video => content = format!("<video controls src=\"{}\" {}></video>", filename, styles.to_html_attr()),
            FileType::Unknown | FileType::Audio | FileType::Video => {
                styles.set("font-size", "11pt".into());
                styles.set("line-height", "17px".into());
                let style_attr = styles.to_html_attr();

                content = format!("<p {style_attr}><a href=\"{filename}\">{filename}</a></p>")
            }
        };

        Ok(self.render_with_note_tags(file.note_tags(), content))
    }

    fn guess_type(file: &EmbeddedFile) -> FileType {
        match file.file_type() {
            FileType::Audio => return FileType::Audio,
            FileType::Video => return FileType::Video,
            _ => {}
        };

        let filename = file.filename();

        if let Some(mime) = mime_guess::from_path(filename).first() {
            if mime.type_() == "audio" {
                return FileType::Audio;
            }

            if mime.type_() == "video" {
                return FileType::Video;
            }
        }
        FileType::Unknown
    }
}
