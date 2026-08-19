use crate::notebook::RgbColor;
use askama::Template;
use color_eyre::Result;
use color_eyre::eyre::WrapErr;

#[derive(Template)]
#[template(path = "notebook.html")]
struct NotebookTemplate<'a> {
    name: &'a str,
    toc: &'a [Toc],
}

pub(crate) enum Toc {
    Section(Section),
    SectionGroup(String, Vec<Section>),
}

#[derive(Debug)]
pub(crate) struct Section {
    pub(crate) name: String,
    pub(crate) path: String,
    pub(crate) color: Option<RgbColor>,
}

pub(crate) fn render(name: &str, toc: &[Toc]) -> Result<String> {
    let template = NotebookTemplate { name, toc };

    template
        .render()
        .wrap_err("Failed to render notebook template")
}

impl NotebookTemplate<'_> {
    pub fn _bool(&self, b: &bool) -> bool {
        *b
    }
}
