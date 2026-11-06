# Repository Guidelines

## Project Structure & Module Organization
The site runs on Next.js 14 App Router. Pages, layouts, and route handlers live under `src/app` (e.g., `blog`, `projects`, `api`). Shared UI and Radix-based primitives are in `src/components`, while cross-cutting logic sits in `src/lib`, data constants in `src/data`, and React contexts in `src/contexts`. Static assets belong in `public/`, and automation scripts reside in `scripts/` (executed with `ts-node`).

## Build, Test, and Development Commands
Use `npm run dev` for a hot-reloading local server on all interfaces. `npm run build` compiles the production bundle and automatically runs `npm run extract` and `npm run push` to refresh content indexes—only run it when credentials are available. `npm run lint` enforces Next.js/ESLint rules, and `npm run format` applies Prettier with the Tailwind plugin. Call `npm run start` to serve the optimized build.

## Coding Style & Naming Conventions
TypeScript is required; favor server components unless interactivity demands `"use client"`. Follow functional component patterns, camelCase for functions/variables, and PascalCase for components and context providers. Tailwind classes should be organized with `clsx`/`cva` helpers; extract reusable variants into `src/lib`. Two-space indentation and trailing commas come from Prettier—do not hand-format files. Keep MDX frontmatter keys lowercase and kebab-case slugs.

## Content Automation & Configuration Tips
`npm run extract` parses MDX/blog content and `npm run push` sends it to downstream services; both expect `.env.local` with API keys. Guard secrets by using `dotenv` and never committing `.env*`. When editing MDX, keep assets in `public/blog/<slug>/` and update `src/data` entries if metadata changes. Verify Resend email templates inside `src/components/email` before deploying.

## Updating From a New Resume
When Fredrik sends a new resume (PDF/`.tex` from `~/Documents/resume/resumes/`):
- Copy the PDF he sends, as-is, to `public/resume.pdf` (the downloadable resume). Don't build a new or mixed resume unless he asks.
- Update **experience only**: overwrite the matching entries' `description` bullets in `src/data/career.json` with the resume bullets. Leave entries not on the resume untouched.
- **Do not change project descriptions** in `src/data/projects.json` and don't add project bullets. Projects keep their hand-written prose descriptions; only fix a specific fact there if he explicitly asks.
