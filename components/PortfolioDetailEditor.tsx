'use client'

import { useEffect, useState } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin'
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { $createHeadingNode, $createQuoteNode, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { INSERT_CHECK_LIST_COMMAND, INSERT_ORDERED_LIST_COMMAND, INSERT_UNORDERED_LIST_COMMAND, ListItemNode, ListNode } from '@lexical/list'
import { AutoLinkNode, LinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $createHorizontalRuleNode, HorizontalRuleNode } from '@payloadcms/richtext-lexical/client'
import { $getSelection, $isRangeSelection, FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND, INDENT_CONTENT_COMMAND, OUTDENT_CONTENT_COMMAND, type EditorState, type SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import { $setBlocksType } from '@lexical/selection'

type Props = { initialValue?: SerializedEditorState | null; onChange: (value: SerializedEditorState) => void }

const emptyState: SerializedEditorState = {
  root: { children: [{ children: [], direction: null, format: '', indent: 0, type: 'paragraph', version: 1 }], direction: null, format: '', indent: 0, type: 'root', version: 1 },
} as unknown as SerializedEditorState

function EditorToolbar() {
  const [editor] = useLexicalComposerContext()
  const formats: Array<{ label: string; command: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code' | 'subscript' | 'superscript' }> = [
    { label: 'Tebal', command: 'bold' }, { label: 'Miring', command: 'italic' },
    { label: 'Garis bawah', command: 'underline' }, { label: 'Coret', command: 'strikethrough' }, { label: 'Kode', command: 'code' },
    { label: 'Subskrip', command: 'subscript' }, { label: 'Superskrip', command: 'superscript' },
  ]
  return <div className="portfolio-editor-toolbar" role="toolbar" aria-label="Format teks">
    {formats.map(({ label, command }) => <button key={command} type="button" aria-label={label} title={label} onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, command)}>{command === 'bold' ? <strong>B</strong> : command === 'italic' ? <em>I</em> : command === 'underline' ? <u>U</u> : command === 'strikethrough' ? <s>S</s> : command === 'subscript' ? <>x<sub>2</sub></> : command === 'superscript' ? <>x<sup>2</sup></> : <code>{'</>'}</code>}</button>)}
    <span aria-hidden="true" />
    <button type="button" aria-label="Judul tingkat dua" title="Judul tingkat dua" onClick={() => editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createHeadingNode('h2')) })}>H2</button>
    <button type="button" aria-label="Judul tingkat tiga" title="Judul tingkat tiga" onClick={() => editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createHeadingNode('h3')) })}>H3</button>
    <button type="button" aria-label="Kutipan" title="Kutipan" onClick={() => editor.update(() => { const selection = $getSelection(); if ($isRangeSelection(selection)) $setBlocksType(selection, () => $createQuoteNode()) })}>❞</button>
    <button type="button" aria-label="Daftar berpoin" title="Daftar berpoin" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)}>• Daftar</button>
    <button type="button" aria-label="Daftar bernomor" title="Daftar bernomor" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)}>1. Daftar</button>
    <button type="button" aria-label="Daftar ceklis" title="Daftar ceklis" onClick={() => editor.dispatchCommand(INSERT_CHECK_LIST_COMMAND, undefined)}>☑ Daftar</button>
    <button type="button" aria-label="Tambah tautan" title="Tambah tautan" onClick={() => { const url = window.prompt('Masukkan alamat tautan'); if (url) editor.dispatchCommand(TOGGLE_LINK_COMMAND, url) }}>Tautan</button>
    <button type="button" aria-label="Garis pemisah" title="Garis pemisah" onClick={() => editor.update(() => { const selection = $getSelection(); if (selection) selection.insertNodes([$createHorizontalRuleNode()]) })}>—</button>
    <button type="button" aria-label="Rata kiri" title="Rata kiri" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}>≡</button>
    <button type="button" aria-label="Rata tengah" title="Rata tengah" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}>≡</button>
    <button type="button" aria-label="Rata kanan" title="Rata kanan" onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}>≡</button>
    <button type="button" aria-label="Tambah inden" title="Tambah inden" onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)}>→</button>
    <button type="button" aria-label="Kurangi inden" title="Kurangi inden" onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)}>←</button>
  </div>
}

function SavePlugin({ onChange }: { onChange: Props['onChange'] }) {
  return <OnChangePlugin onChange={(editorState: EditorState) => onChange(editorState.toJSON() as SerializedEditorState)} />
}

export default function PortfolioDetailEditor({ initialValue, onChange }: Props) {
  const [editorState, setEditorState] = useState<SerializedEditorState>(initialValue || emptyState)
  useEffect(() => { setEditorState(initialValue || emptyState) }, [initialValue])

  const config = {
    namespace: 'TelkomStudentCreationPortfolioDetails',
    editorState: JSON.stringify(editorState),
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, LinkNode, AutoLinkNode, HorizontalRuleNode],
    onError(error: Error) { console.error(error) },
    theme: {
      paragraph: 'portfolio-editor-paragraph',
      heading: { h1: 'portfolio-editor-h1', h2: 'portfolio-editor-h2', h3: 'portfolio-editor-h3' },
      list: { ul: 'portfolio-editor-ul', ol: 'portfolio-editor-ol', listitem: 'portfolio-editor-listitem' },
      quote: 'portfolio-editor-quote',
      link: 'portfolio-editor-link',
      text: { bold: 'portfolio-editor-bold', italic: 'portfolio-editor-italic', underline: 'portfolio-editor-underline', strikethrough: 'portfolio-editor-strikethrough', code: 'portfolio-editor-code' },
    },
  }

  return <div className="portfolio-editor">
    <LexicalComposer key={JSON.stringify(editorState)} initialConfig={config}>
      <EditorToolbar />
      <div className="portfolio-editor-canvas">
        <RichTextPlugin contentEditable={<ContentEditable className="portfolio-editor-content" aria-label="Detail lengkap karya" />} placeholder={<span className="portfolio-editor-placeholder">Ceritakan tujuan, proses, tantangan, dan hasil karya…</span>} ErrorBoundary={LexicalErrorBoundary} />
        <HistoryPlugin /><ListPlugin /><CheckListPlugin /><LinkPlugin /><SavePlugin onChange={onChange} />
      </div>
    </LexicalComposer>
    <p className="portfolio-editor-help">Pilih teks untuk memformatnya. Gunakan pintasan Markdown seperti <code>## Judul</code>, <code>- daftar</code>, atau <code>&gt; kutipan</code> lalu tekan spasi.</p>
  </div>
}
