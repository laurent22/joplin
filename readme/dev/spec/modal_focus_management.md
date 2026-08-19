# Modal focus management

Most Joplin dialogs should follow the [modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/). On desktop, this is usually done with the native [`<dialog>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog) element. On mobile, it's a bit more complicated.

## Mobile

### Managing focus

On mobile, the `<AccessibleView>` component allows moving focus to a component or preventing a component from being accessibility focused. For example,
```jsx
<AccessibleView inert={true}>{children}</AccessibleView>
```
prevents `children` from being focused using accessibility tools in a cross-platform way. The `inert` prop is named after the [HTML `inert` attribute](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/inert).

Similarly, the following logic auto-focuses `children` when the view first renders:
```jsx
// Danger: This implicitly sets `accessible={true}`, which prevents
// VoiceOver from focusing individual children in `children`.
<AccessibleView refocusCounter={1}>{children}</AccessibleView>
```

Changing the `refocusCounter` prop causes the `AccessibleView` to be focused again.

### Native `Modal`s

React Native has a built-in `Modal` component.

The `components/Modal` component wraps this built-in `Modal` component. Among other things, this wrapper tracks whether `Modal`s are open, closing, or closed. This allows greater customization over where focus moves after modals are dismissed.

When a `Modal` is visible, it prevents content behind it from being focused. With the React Native built-in `Modal`, setting focus to items behind a visible `Modal` does nothing. On Android, this is also the case briefly after the `Modal` is dismissed.

The custom `Modal` works with `AccessibleView` to improve focus behavior. The `Modal` keeps track of the last `AccessibleView` that was focused while the `Modal` was open. When the `Modal` is dismissed, it auto-focuses this `AccessibleView`. This is useful, for example, if an button in a `Modal` shows UI that needs to be auto-focused when the `Modal` is dismissed. The custom `Modal` determines when the native `Modal` is dismissed, and could then move focus to the just-shown UI.

### Inaccessible 3rd-party modals

Sometimes a library includes a component that should handle focus in a modal-like way, but doesn't. Examples include [`react-native-paper`'s Modal](https://github.com/callstack/react-native-paper/issues/3912) and [`react-native-popup-menu`'s Menu](https://github.com/instea/react-native-popup-menu/issues/138). The components in the `FocusControl` object can often improve focus management for these libraries.

`FocusControl` provides three components:
- A `FocusControl.Provider` that sets up shared focus-related state.
- A `FocusControl.MainAppContent` that should wrap the main application content (everything that isn't part of a modal).
- A `FocusControl.ModalWrapper` that should be used to wrap content within modals. This allows `FocusControl` to determine whether a modal is visible.

When a modal is visible, the `MainAppContent` is wrapped with an `inert` `AccessibleView`, preventing it from receiving accessibility focus. This traps focus within the visible modal components.

In general, prefer Joplin's `components/Modal` component to react-native-paper `Modal`s. As an example, however, a [`react-native-paper` `Modal`](https://callstack.github.io/react-native-paper/docs/components/Modal/) might be rendered with:
```tsx
<Portal>
    <Modal
        visible={visible}
        onDismiss={onDismiss}
    >
        <FocusControl.ModalWrapper
            state={visible ? ModalState.Open : ModalState.Closed}
        >
            {...content here...}
        </FocusControl.ModalWrapper>
    </Modal>
</Portal>
```

Above, the `FocusControl.ModalWrapper` communicates whether the dialog is visible to the global `<FocusControl.Provider>`. This allows the `MainAppContent` (not shown above) to be marked as focusable or unfocusable depending on whether the `Modal` is visible or not.

:::danger

The [`<Portal>`](https://callstack.github.io/react-native-paper/docs/components/Portal/) is important part of the example. A `<Portal>` is a react-native-paper component that renders its children outside of the main app content (near the global `PaperProvider`).

If the `<Portal>` is omitted, then the modal, and the `FocusControl.ModalWrapper`'s children, will be rendered within the main app content. This will cause them to be marked as unfocusable when the modal is visible, preventing screen readers from accessing the modal's content.

When adding a `FocusControl.ModalWrapper`, it's important to verify that the modal can still be used by a screen reader.

:::
