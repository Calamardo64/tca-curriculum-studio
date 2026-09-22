# TCA Curriculum Studio

Standalone static curriculum-planning application for The Chess Academy's January 2027 level system.

## What is included

- Ten levels with ten visible positions each.
- The supplied 95-topic initial draft preloaded exactly as a working board.
- Topic catalogue, drag-and-drop, touch-friendly move controls, notes, statuses and curriculum roles.
- Local autosave, undo/redo, named recovery versions and version comparison.
- Overview checks, presentation mode, print/PDF, JSON, CSV and compressed share links.
- No backend, analytics, authentication, cookies or OpenAI dependency.

## Local preview

Serve this directory over HTTP. For example:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## GitHub Pages

This directory includes a GitHub Actions workflow that publishes the repository root to GitHub Pages after every push to `main`. In the repository settings, choose **GitHub Actions** as the Pages source.

Every visitor receives an independent browser-local copy. Share links and JSON files exchange snapshots; they are not real-time collaboration.
