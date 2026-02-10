export type Project = {
  slug: string;
  title: string;
  year: string;
  client?: string;
  videoUrl: string;
  thumbnailUrl: string;
  description?: string;
  featured?: boolean;
};

export const projects: Project[] = [
  {
    slug: "sample-project",
    title: "Sample Project",
    featured: true,
    year: "2025",
    client: "Client Name",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnailUrl: "https://picsum.photos/seed/ghost1/1280/720",
    description: "A sample project to demonstrate the portfolio layout.",
  },
  {
    slug: "brand-campaign",
    title: "Brand Campaign",
    year: "2025",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnailUrl: "https://picsum.photos/seed/ghost2/1280/720",
    description: "Creative direction and production.",
  },
  {
    slug: "product-launch",
    title: "Product Launch",
    year: "2024",
    client: "Brand",
    videoUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    thumbnailUrl: "https://picsum.photos/seed/ghost3/1280/720",
    description: "Launch film for a new product release.",
  },
];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getAllProjects(): Project[] {
  return [...projects].sort((a, b) => b.year.localeCompare(a.year));
}
