use crate::page::Renderer;
use crate::utils::{StyleSet, html_entities};
use color_eyre::Result;
use itertools::Itertools;
use parser::property::rich_text::MathExpression;


impl<'a> Renderer<'a> {
    pub(crate) fn render_math(&mut self, math: &Vec<MathExpression>, style: &StyleSet) -> Result<String> {
        let tex = math.iter().map(|tex| {
            &tex.latex
        }).join("");

        let source = format!(
            "{}{}",

            // LaTeX macros used by the math definitions.
            // TODO: This simplifies the parser implementation, but it would be
            // good to replace these with standard KaTeX operators.
            r"\def\matInt#1#2#3{\int_{#1}^{#2}{#3}}
            \def\inParens#1{\left( {#1} \right)}
            \def\fnCall#1#2{{ \rm #1 }\ {#2}}
            \def\withSubscript#1#2{{#1}_{#2}}
            \def\pow#1#2{{#1}^{#2}}
            \def\unknown#1{\textsf{Unknown}(#1)}".replace("\n", "").replace("    ", ""),
            tex,
        );

        let opening_html = format!(
            "<span class=\"joplin-editable\" {}>",
            style.to_html_attr(),
        );
        let source_html = format!(
            "<span class=\"joplin-source\" data-joplin-language=\"katex\" data-joplin-source-open=\"$\" data-joplin-source-close=\"$\" style=\"display: none;\">{}</span>",
            html_entities(source.trim()),
        );

        // TODO: Render it! (For now, display the raw source).
        let rendered_html = html_entities(tex.trim());

        Ok(format!("{opening_html}{source_html}{rendered_html}</span>"))
    }
}
