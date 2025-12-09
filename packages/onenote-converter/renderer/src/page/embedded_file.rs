use crate::page::Renderer;
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

        let file_type = Self::guess_type(file);

        match file_type {
            // TODO: we still don't have support for the audio tag on html notes https://github.com/laurent22/joplin/issues/11939
            // FileType::Audio => content = format!("<audio class=\"media-player media-audio\"controls><source src=\"{}\" type=\"audio/x-wav\"></source></audio>", filename),
            FileType::Video => content = format!("<video controls src=\"{}\"></video>", filename),
            FileType::Unknown | FileType::Audio => {
                content = format!(
                    "<p style=\"font-size: 11pt; line-height: 17px;\"><a href=\"{}\">{}</a></p>",
                    filename, filename
                )
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
