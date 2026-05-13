// cspell:ignore isnot Pbgra

const xpsToPngPowerShellScript = String.raw`
$ErrorActionPreference = 'Stop'

# Load the WPF assemblies that expose XpsDocument and bitmap rendering APIs.
$assemblies = @(
	'PresentationCore',
	'PresentationFramework',
	'ReachFramework',
	'System.Xaml',
	'WindowsBase'
)

foreach ($assembly in $assemblies) {
	Add-Type -AssemblyName $assembly
}

# Compile the C# renderer once for this PowerShell process.
Add-Type -ReferencedAssemblies $assemblies -TypeDefinition @"
using System;
using System.IO;
using System.Windows;
using System.Windows.Documents;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Xps.Packaging;

namespace Joplin {
	public static class XpsConverter {
		private const double MaxRenderedPixels = 16000000;

		public static void RenderPages(string inputPath, int[] pageNumbers, string[] outputPaths, double scale) {
			if (String.IsNullOrEmpty(inputPath)) {
				throw new ArgumentException("Missing input path.", "inputPath");
			}

			if (pageNumbers == null) {
				throw new ArgumentNullException("pageNumbers");
			}

			if (outputPaths == null) {
				throw new ArgumentNullException("outputPaths");
			}

			if (pageNumbers.Length != outputPaths.Length) {
				throw new ArgumentException("Page numbers and output paths must have the same length.");
			}

			using (XpsDocument document = new XpsDocument(inputPath, FileAccess.Read)) {
				FixedDocumentSequence sequence = document.GetFixedDocumentSequence();
				DocumentPaginator paginator = sequence.DocumentPaginator;

				for (int i = 0; i < pageNumbers.Length; i++) {
					RenderPage(paginator, pageNumbers[i], outputPaths[i], scale);
				}
			}
		}

		private static void RenderPage(DocumentPaginator paginator, int pageNumber, string outputPath, double scale) {
			if (String.IsNullOrEmpty(outputPath)) {
				throw new ArgumentException("Missing output path.", "outputPath");
			}

			if (pageNumber < 1) {
				throw new ArgumentOutOfRangeException("pageNumber");
			}

			int pageIndex = pageNumber - 1;
			DocumentPage page = paginator.GetPage(pageIndex);
			try {
				Size pageSize = page.Size;
				double renderScale = scale;
				double unscaledPixels = pageSize.Width * pageSize.Height;
				if (unscaledPixels * renderScale * renderScale > MaxRenderedPixels) {
					renderScale = Math.Sqrt(MaxRenderedPixels / unscaledPixels);
				}
				int pixelWidth = Math.Max(1, (int)Math.Ceiling(pageSize.Width * renderScale));
				int pixelHeight = Math.Max(1, (int)Math.Ceiling(pageSize.Height * renderScale));

				DrawingVisual visual = new DrawingVisual();
				using (DrawingContext context = visual.RenderOpen()) {
					context.DrawRectangle(Brushes.White, null, new Rect(new Point(0, 0), pageSize));
					context.PushTransform(new ScaleTransform(renderScale, renderScale));
					context.DrawRectangle(new VisualBrush(page.Visual), null, new Rect(new Point(0, 0), pageSize));
					context.Pop();
				}

				RenderTargetBitmap bitmap = new RenderTargetBitmap(pixelWidth, pixelHeight, 96, 96, PixelFormats.Pbgra32);
				bitmap.Render(visual);

				PngBitmapEncoder encoder = new PngBitmapEncoder();
				encoder.Frames.Add(BitmapFrame.Create(bitmap));

				using (FileStream stream = new FileStream(outputPath, FileMode.Create, FileAccess.Write)) {
					encoder.Save(stream);
				}
			} finally {
				page.Dispose();
			}
		}
	}
}
"@

# The TypeScript side passes page/output pairs as JSON in a file. This avoids
# environment variable size limits for large printouts with many pages.
$pages = Get-Content -LiteralPath $env:JOPLIN_XPS_PAGES_FILE -Raw | ConvertFrom-Json
if ($pages -isnot [array]) {
	$pages = @($pages)
}

$pageNumbers = New-Object 'int[]' $pages.Count
$outputPaths = New-Object 'string[]' $pages.Count
for ($i = 0; $i -lt $pages.Count; $i++) {
	$pageNumbers[$i] = [int]$pages[$i].PageNumber
	$outputPaths[$i] = [string]$pages[$i].OutputPath
}

[Joplin.XpsConverter]::RenderPages($env:JOPLIN_XPS_INPUT, $pageNumbers, $outputPaths, 2.0)
`;

export default xpsToPngPowerShellScript;
