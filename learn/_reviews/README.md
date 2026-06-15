# Proofreading review files / 校正ファイル

Drop exported proofreading files here as `learn/_reviews/<slug>.json`
(e.g. `graphene.json`), commit, then tell Claude **"apply the review for
`<slug>`"**.

校正の書き出し（Export）で得た JSON を `<slug>.json`（例 `graphene.json`）と
してここに置き、コミットしてから Claude に「`<slug>` の校正を反映して」と
伝えてください。

This folder is underscore-prefixed, so GitHub Pages (Jekyll) keeps it **out of
the published site** — it lives in the repo only, as a working artifact. Claude
deletes a file once its edits are applied.

## Format (`schema: yumigeta-proofread/v1`)

```jsonc
{
  "schema": "yumigeta-proofread/v1",
  "page": "/learn/graphene/",
  "slug": "graphene",
  "title": "…",
  "generatedAt": "2026-…",
  "summary": { "delete": 0, "replace": 0, "insert": 0, "comment": 0, "total": 0 },
  "edits": [
    {
      "type": "delete | replace | insert | comment",
      "lang": "en | ja",
      "section": "section hint (e.g. '00 — Bands · …')",
      "prefix": "≈55 chars of text before the change",
      "oldText": "the targeted text (deleted / replaced / commented)",
      "newText": "the new text (replace / insert)",
      "comment": "the note (comment)",
      "suffix": "≈55 chars of text after the change"
    }
  ]
}
```

The targeted text lives inside an `.i18n-en` / `.i18n-ja` span in
`learn/<slug>/index.html`; use `prefix` + `suffix` + `section` to locate the
exact occurrence. See **CLAUDE.md → "Proofreading (校正) Learn pages"** for the
full apply procedure.
