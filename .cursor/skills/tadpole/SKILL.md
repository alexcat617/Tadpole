---
name: tadpole
description: Work in the Tadpole monorepo — add or update projects under projects/, keep design assets organized, and only scaffold apps when explicitly requested. Use when working in this repository, adding a new project, or moving from design notes to implementation.
---

# Tadpole

Tadpole is a monorepo for app experiments. Each app or prototype lives under `projects/<project-name>/`. The root [README.md](../../../README.md) lists active projects.

## Layout (per project)

```text
projects/<project-name>/
├── README.md          # Notes, status, Figma link
└── design/            # Design exports and references (not app code)
```

- **README.md** — Short project title, **Notes** (status and intent), **Design** section with a Figma link (replace `PLACEHOLDER` with the real file URL when known).
- **design/** — Static design assets only. Use `.gitkeep` when the folder would otherwise be empty.

Do not add application scaffolds (framework boilerplate, `package.json`, src trees, etc.) unless the user explicitly asks to scaffold or build the app.

## Adding a new project

1. Create `projects/<kebab-case-name>/`.
2. Add `README.md` using the same sections as [my-first-project](../../../projects/my-first-project/README.md) (Notes + Design with Figma placeholder).
3. Add `design/.gitkeep` if there are no design files yet.
4. Add a row to the projects table in the root [README.md](../../../README.md).
5. Commit with a clear message; prefer a focused diff (no unrelated root cleanup).

## Working on an existing project

- Read that project's `README.md` before changing structure or adding code.
- Put new design files under `projects/<name>/design/`, not at the repo root.
- When the user provides a Figma URL, update the **Design** section in that project's README.
- When scaffolding is requested, colocate the app under `projects/<name>/` and update the project README to reflect the stack and how to run it.

## Out of scope unless asked

- Creating CI, Docker, or Cloud Agent `environment.json` for a project.
- Removing legacy root files or reorganizing the repo beyond the new project.
- Generating app code from Figma automatically.

## Manual invocation

Use `/tadpole` when you want these conventions applied explicitly (for example, "add another project like my-first-project").
