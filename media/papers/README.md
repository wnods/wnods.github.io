# Adding a project

1. Copy the article PDF into this folder.
2. Open `data/projects.json`.
3. Add an entry using this structure:

```json
{
  "title": "Article title",
  "year": "2026",
  "type": "Research article",
  "authors": "Author One, Author Two",
  "summary": "A short description of the work.",
  "abstract": "The article abstract shown in the project window.",
  "introduction": "A concise introduction to the problem and the study.",
  "topics": ["Lattice Boltzmann", "Reactive flow"],
  "pdf": "media/papers/article-file.pdf",
  "repository": "https://github.com/wnods/repository"
}
```

The `repository` field is optional. Keep PDF filenames lowercase and use hyphens instead of spaces. Each entry automatically creates a clickable card, a project presentation window, and access to the interactive PDF reader.
