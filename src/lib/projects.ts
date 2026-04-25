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

export const projects: Project[] = [];

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function getAllProjects(): Project[] {
  return [...projects].sort((a, b) => b.year.localeCompare(a.year));
}
