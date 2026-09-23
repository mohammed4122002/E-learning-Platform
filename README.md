# بوابة التدريب — E-learning Platform

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Arabic-first RTL UI.

The UI is implemented from the project's Figma file, which is the single source of truth.
Implemented so far: **Trainee dashboard** — frame `TRN-DSH-01 · لوحة المتدرب · الإصدار ٢` (node `102:529`).

## Scripts

```bash
npm run dev          # development server
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # next typegen + tsc
npm run fetch:covers # download the course-cover images from Figma (needs FIGMA_TOKEN)
```

## Structure

```
src/app/                 layout (lang="ar" dir="rtl", Tajawal font), page, design tokens (globals.css)
src/components/layout/   AppShell, Sidebar, SidebarNavItem, TopBar
src/components/dashboard/ dashboard sections and cards
src/components/ui/       Button, Icon, Pill, ProgressBar, SectionHeader
src/lib/                 dashboard content (copied from Figma), asset helpers
src/types/               shared types
public/assets/icons/     SVG icons exported from Figma
public/assets/images/    course covers (run `npm run fetch:covers`)
```

## Course covers

The six cover photos are image fills in Figma. Download them with a Figma personal access token:

```bash
FIGMA_TOKEN=xxxx npm run fetch:covers
```

Until they are present, the covers render the Figma "Media / Image Placeholder" frame (tint + dashed stroke).
