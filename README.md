# ZHL Academic Notes

Quartz site for academic notes, literature reading, protocols, and SCOP documentation.

## Local workflow

```bash
npm install
npm run dev
```

Open the local URL printed by Quartz, usually `http://localhost:8080`.

## Writing notes

Use `content/` as the Obsidian vault folder.

Quartz supports Obsidian wikilinks such as `[[PSD95]]`, tags, backlinks, search, graph view, callouts, Mermaid, and LaTeX.

LaTeX and generated OG images are disabled in `quartz.config.yaml` for now because their optional native/network dependencies are fragile on Windows and during first deployment. Re-enable `latex` after confirming the deployment environment installs its native dependencies cleanly.

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the GitHub repository in Vercel.
3. Keep the defaults from `vercel.json`:
   - install: `npm ci`
   - build: `npx quartz build`
   - output: `public`

If the production domain changes, update `baseUrl` in `quartz.config.yaml` and `homepage` in `package.json`.
