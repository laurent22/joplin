import SwiftUI
import UIKit

// iPad-only. Fresh rebuild (per request) — a default NavigationSplitView with 3
// plain sections (Notebooks / Notes / Editor), no custom column-width persistence or
// styling yet. `.automatic` visibility (rather than a hardcoded `.all`) lets the
// system decide when to collapse columns as the window narrows, so we can first
// confirm that resize/collapse behavior works before layering anything custom back
// on top of it.
struct PadContentView: View {
    @State private var columnVisibility: NavigationSplitViewVisibility = .automatic
    // Read here, above NavigationSplitView, and passed down explicitly — inside a
    // column (e.g. PadNoteListView), @Environment(\.horizontalSizeClass) reflects that
    // column's own (narrow) width, not the overall window, so it was reporting
    // .compact even with all 3 columns visible on a full-size iPad.
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            PadSidebarView()
        } content: {
            PadNoteListView(windowSizeClass: horizontalSizeClass)
        } detail: {
            PadEditorView()
        }
    }
}

#Preview {
    PadContentView()
        .environmentObject(AppState())
}

// MARK: - System focus ring on List rows

/// Clears the focus ring iPadOS draws around a List row once that row has been
/// tapped. The ring is not our selection highlight (rows already draw their own, and
/// it is absent until the first tap even though a row is selected from the start) and
/// it is not the list style: it follows keyboard/pointer focus, which is why it stays
/// put in the sidebar and disappears in the note list as soon as the editor takes
/// focus.
///
/// SwiftUI's .focusEffectDisabled() does not reach it, because the ring belongs to the
/// collection-view cell hosting the row rather than to any view SwiftUI hosts. The cell
/// is UIKit's, so this clears it through UIKit's own API for exactly that
/// (UIView.focusEffect, iOS 17+) by walking up from a zero-sized probe placed in the
/// row to the cell containing it.
private struct CellFocusRingDisabler: UIViewRepresentable {
    final class ProbeView: UIView {
        // didMoveToWindow rather than updateUIView: cells are recycled as the list
        // scrolls, and a reused cell is re-attached rather than re-created, so this is
        // the point at which the row is reliably inside its (possibly new) cell.
        override func didMoveToWindow() {
            super.didMoveToWindow()
            clearEnclosingCellFocusEffect()
        }

        private func clearEnclosingCellFocusEffect() {
            var next: UIView? = superview
            while let view = next {
                if view is UICollectionViewCell || view is UITableViewCell {
                    view.focusEffect = nil
                    return
                }
                // Reaching the list itself means there is no cell to clear; stop rather
                // than walk the rest of the window's hierarchy.
                if view is UICollectionView || view is UITableView { return }
                next = view.superview
            }
        }
    }

    func makeUIView(context: Context) -> UIView {
        let view = ProbeView(frame: .zero)
        view.isUserInteractionEnabled = false
        view.backgroundColor = .clear
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}
}

extension View {
    /// Applied to a List row's content. See CellFocusRingDisabler.
    func disablingCellFocusRing() -> some View {
        background(CellFocusRingDisabler().frame(width: 0, height: 0).allowsHitTesting(false))
    }
}
