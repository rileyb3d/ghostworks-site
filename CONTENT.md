# Adding Portfolio Projects

To add a new project to the Ghostworks portfolio:

1. Open `src/lib/projects.ts`
2. Add a new object to the `projects` array:

```ts
{
  slug: "my-project",           // URL path, use lowercase + hyphens
  title: "Project Title",
  year: "2025",
  client: "Client Name",        // optional
  videoUrl: "https://...",      // YouTube, Vimeo, or direct .mp4 URL
  thumbnailUrl: "https://...",  // or "/images/my-thumb.jpg" for local
  description: "Optional description.",
},
```

## Video URLs

- **YouTube**: `https://www.youtube.com/watch?v=VIDEO_ID` or `https://youtu.be/VIDEO_ID`
- **Vimeo**: `https://vimeo.com/VIDEO_ID`
- **Direct video**: Any URL to an `.mp4` file

## Images

- Use **external URLs** (add the domain to `next.config.ts` → `images.remotePatterns` if needed)
- Or place images in `public/images/` and use paths like `/images/thumbnail.jpg`

Projects are sorted by year (newest first) on the home page.
