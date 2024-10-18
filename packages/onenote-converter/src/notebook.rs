use crate::parser::notebook::Notebook;
use crate::parser::property::common::Color;
use crate::parser::section::{Section, SectionEntry};
use crate::templates::notebook::Toc;
use crate::utils::utils::log;
use crate::utils::{join_path, make_dir, remove_prefix};
use crate::{section, templates};
use color_eyre::eyre::Result;
use palette::rgb::Rgb;
use palette::{Alpha, ConvertFrom, Hsl, Saturate, Shade, Srgb};

pub(crate) type RgbColor = Alpha<Rgb<palette::encoding::Srgb, u8>, f32>;

pub(crate) struct Renderer;

impl Renderer {
    pub fn new() -> Self {
        Renderer
    }

    pub fn render(&mut self, notebook: &Notebook, name: &str, output_dir: &str) -> Result<()> {
        log!("Notebook name: {:?} {:?}", name, output_dir);
        let _ = unsafe { make_dir(output_dir) };

        // let notebook_dir = unsafe { join_path(output_dir, sanitize_filename::sanitize(name).as_str()) }.unwrap().as_string().unwrap();
        let notebook_dir = output_dir.to_owned();

        let _ = unsafe { make_dir(&notebook_dir) };

        let mut toc = Vec::new();

        for entry in notebook.entries() {
            match entry {
                SectionEntry::Section(section) => {
                    toc.push(Toc::Section(self.render_section(
                        section,
                        notebook_dir.clone(),
                        output_dir.into(),
                    )?));
                }
                SectionEntry::SectionGroup(group) => {
                    let dir_name = sanitize_filename::sanitize(group.display_name());
                    let section_group_dir =
                        unsafe { join_path(notebook_dir.as_str(), dir_name.as_str()) }
                            .unwrap()
                            .as_string()
                            .unwrap();

                    log!("Section group directory: {:?}", section_group_dir);
                    let _ = unsafe { make_dir(section_group_dir.as_str()) };

                    let mut entries = Vec::new();

                    for entry in group.entries() {
                        if let SectionEntry::Section(section) = entry {
                            entries.push(self.render_section(
                                section,
                                section_group_dir.clone(),
                                output_dir.to_owned(),
                            )?);
                        }
                    }

                    toc.push(templates::notebook::Toc::SectionGroup(
                        group.display_name().to_string(),
                        entries,
                    ))
                }
            }
        }

        templates::notebook::render(name, &toc)?;

        Ok(())
    }

    fn render_section(
        &mut self,
        section: &Section,
        notebook_dir: String,
        base_dir: String,
    ) -> Result<templates::notebook::Section> {
        let mut renderer = section::Renderer::new();
        let section_path = renderer.render(section, notebook_dir)?;
        log!("section_path: {:?}", section_path);

        let path_from_base_dir = unsafe { remove_prefix(section_path.as_str(), base_dir.as_str()) }
            .unwrap()
            .as_string()
            .unwrap();
        log!("path_from_base_dir: {:?}", path_from_base_dir);
        Ok(templates::notebook::Section {
            name: section.display_name().to_string(),
            path: path_from_base_dir,
            color: section.color().map(prepare_color),
        })
    }
}

fn prepare_color(color: Color) -> RgbColor {
    Alpha {
        alpha: color.alpha() as f32 / 255.0,
        color: Srgb::convert_from(
            Hsl::convert_from(Srgb::new(
                color.r() as f32 / 255.0,
                color.g() as f32 / 255.0,
                color.b() as f32 / 255.0,
            ))
            .darken(0.2)
            .saturate(1.0),
        )
        .into_format(),
    }
}
