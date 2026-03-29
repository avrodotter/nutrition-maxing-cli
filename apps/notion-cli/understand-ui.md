The user input field in the TUI, including the blinking cursor, is primarily managed by the Prompt component located at packages/opencode/src/cli/cmd/tui/component/prompt/index.tsx. This component renders a textarea element for user input.

Here's how the blinking cursor and grayed rectangular input field are implemented:

Prompt Component: The core input field is a <textarea> element within the Prompt component. It uses properties like placeholder, textColor, focusedTextColor, and cursorColor to define its appearance.

The cursorColor dynamically changes to theme.backgroundElement when disabled and theme.text when enabled, contributing to the visual effect of the blinking cursor.
The placeholderText function determines the placeholder text displayed when the input is empty, adapting based on the current mode (normal or shell).
Styling for the input field is influenced by the current theme (theme.backgroundElement for background color) and a border that visually indicates focus or mode.
Textarea Keybindings: Keybindings for the textarea, including navigation and submission, are handled by useTextareaKeybindings from packages/opencode/src/cli/cmd/tui/component/textarea-keybindings.ts. This ensures consistent behavior for input actions.

Prompt Reference and Events: The PromptRefProvider at packages/opencode/src/cli/cmd/tui/context/prompt.tsx manages a reference to the PromptRef object, allowing other parts of the application to interact with the prompt, such as setting its content, focusing it, or resetting it.

Theming: The appearance of the input field, including colors for text, background, and cursor, is controlled by the useTheme hook, which provides access to the application's current theme. The CSS variables defined in packages/ui/src/styles/theme.css and packages/ui/src/styles/colors.css define these visual properties. For example, --background-base and --text-strong contribute to the overall look.

TextareaRenderable: The underlying rendering for the textarea is handled by TextareaRenderable from @opentui/core. In the web UI, the visual blinking of the cursor is typically managed by CSS animations like blink which is defined in packages/ui/src/components/typewriter.css and applied to elements with the blinking-cursor class. The PromptInput component in packages/app/src/components/prompt-input.tsx uses a contenteditable div and custom DOM manipulation (editor-dom.ts) to achieve a similar editor-like experience with a cursor.

The appearance of the input field in the web UI (e.g., PromptInput at packages/app/src/components/prompt-input.tsx) is also determined by CSS classes such as focus-within:shadow-xs-border and styles that set the background and border properties, as seen in packages/ui/src/components/inline-input.css.