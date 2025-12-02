use crate::page::Renderer;
use crate::utils::{StyleSet, html_entities};
use color_eyre::Result;
use itertools::Itertools;
use parser::property::rich_text::MathExpression;

impl<'a> Renderer<'a> {
    pub(crate) fn render_math(
        &mut self,
        math: &[MathExpression],
        style: &StyleSet,
    ) -> Result<String> {
        let tex = math.iter().map(|tex| &tex.latex).join("");

        let source = format!("{}{}", self.render_tex_macros(&tex), tex,);

        let opening_html = format!("<span class=\"joplin-editable\" {}>", style.to_html_attr(),);
        let source_html = format!(
            "<span class=\"joplin-source\" data-joplin-language=\"katex\" data-joplin-source-open=\"$\" data-joplin-source-close=\"$\" style=\"display: none;\">{}</span>",
            html_entities(source.trim()),
        );

        // TODO: Render it! (For now, display the raw source).
        let rendered_html = html_entities(tex.trim());

        Ok(format!("{opening_html}{source_html}{rendered_html}</span>"))
    }

    /// Returns definitions for non-standard KaTeX macros used in `tex`.
    fn render_tex_macros(&self, tex: &str) -> String {
        let mut result = vec![];
        if tex.contains("\\∫") {
            result.push(r"\def\∫#1#2#3{\int_{#1}^{#2}{#3}}");
        }
        if tex.contains("\\∑") {
            result.push(r"\def\∑#1#2#3{\sum_{#1}^{#2}{#3}}");
        }
        if tex.contains("\\parens") {
            result.push(r"\def\parens#1{\left( {#1} \right)}");
        }
        if tex.contains("\\withSubscript") {
            result.push(r"\def\withSubscript#1#2{{#1}_{#2}}");
        }
        if tex.contains("\\pow") {
            result.push(r"\def\pow#1#2{{#1}^{#2}}");
        }
        if tex.contains("\\fnCall") {
            result.push(r"\def\fnCall#1#2{{ \rm #1 }\ {#2}}");
        }
        if tex.contains("\\unknown") {
            result.push(r"\def\unknown#1{\textsf{Unknown}(#1)}");
        }

        result.join("")
    }
}
