import { Placeholder } from "@tiptap/extensions";
import { EditorContent, useEditor, useEditorState, type Editor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Link2, List, ListOrdered, Underline } from "lucide-react";
import { useState } from "react";

import type { TiptapDoc } from "@/lib/site-review/types";

export function isEmptyDoc(editor: Editor) {
  return editor.isEmpty || !editor.getText().trim();
}

export function useCommentEditor({
  content,
  editable,
  onChange,
}: {
  content: TiptapDoc | null;
  editable: boolean;
  onChange: (editor: Editor) => void;
}) {
  return useEditor({
    // Tiptap would inject its base CSS into document.head, which can't reach the shadow root.
    injectCSS: false,
    autofocus: editable && !content ? "end" : false,
    editable,
    content: (content as JSONContent | null) ?? undefined,
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
        link: { openOnClick: !editable, autolink: true, defaultProtocol: "https", HTMLAttributes: { target: "_blank", rel: "noopener noreferrer nofollow" } },
      }),
      Placeholder.configure({ placeholder: "What should change here? e.g. “Swap this headline for…”" }),
    ],
    onUpdate: ({ editor }) => onChange(editor),
  });
}

const BUTTONS = [
  { key: "bold", label: "Bold", icon: Bold, run: (e: Editor) => e.chain().focus().toggleBold().run() },
  { key: "italic", label: "Italic", icon: Italic, run: (e: Editor) => e.chain().focus().toggleItalic().run() },
  { key: "underline", label: "Underline", icon: Underline, run: (e: Editor) => e.chain().focus().toggleUnderline().run() },
  { key: "bulletList", label: "Bulleted list", icon: List, run: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { key: "orderedList", label: "Numbered list", icon: ListOrdered, run: (e: Editor) => e.chain().focus().toggleOrderedList().run() },
] as const;

export function FormatBar({ editor }: { editor: Editor }) {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      link: e.isActive("link"),
    }),
  });
  const [linking, setLinking] = useState<string | null>(null);

  const applyLink = () => {
    const href = (linking ?? "").trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!href) chain.unsetLink().run();
    else chain.setLink({ href: /^(https?:|mailto:)/i.test(href) ? href : `https://${href}` }).run();
    setLinking(null);
  };

  if (linking !== null) {
    return (
      <div className="lb-format lb-format--link">
        <input
          autoFocus
          className="lb-link-input"
          placeholder="Paste a link…"
          value={linking}
          onChange={(e) => setLinking(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyLink();
            }
            if (e.key === "Escape") {
              e.stopPropagation();
              setLinking(null);
            }
          }}
        />
        <button type="button" className="lb-btn lb-btn--small lb-btn--gold" onMouseDown={(e) => e.preventDefault()} onClick={applyLink}>
          {linking.trim() ? "Add" : "Remove"}
        </button>
      </div>
    );
  }

  return (
    <div className="lb-format" role="toolbar" aria-label="Formatting">
      {BUTTONS.map(({ key, label, icon: Icon, run }) => (
        <button
          key={key}
          type="button"
          title={label}
          aria-label={label}
          aria-pressed={active?.[key]}
          className="lb-icon-btn"
          // Keep the editor selection while clicking.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run(editor)}
        >
          <Icon size={15} />
        </button>
      ))}
      <button
        type="button"
        title="Link"
        aria-label="Link"
        aria-pressed={active?.link}
        className="lb-icon-btn"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setLinking((editor.getAttributes("link").href as string | undefined) ?? "")}
      >
        <Link2 size={15} />
      </button>
    </div>
  );
}

export { EditorContent };
