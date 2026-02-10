# Ghostworks

Portfolio site for Ghostworks — a creative studio.

## Stack

- **Next.js 16** with App Router
- **TypeScript**
- **Tailwind CSS**
- **Vercel**-ready deployment

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment

Deploy to Vercel by connecting this GitHub repo. No additional configuration needed.

## Adding Projects

See [CONTENT.md](./CONTENT.md) for instructions on adding new portfolio projects.

## Project Structure

```
src/
├── app/
│   ├── [slug]/     # Project detail pages
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx    # Home / portfolio grid
├── components/
│   ├── Header.tsx
│   ├── ProjectCard.tsx
│   └── VideoPlayer.tsx
└── lib/
    └── projects.ts # Portfolio data — edit here to add projects
```
