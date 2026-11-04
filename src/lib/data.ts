export type Video = {
  id: number; title: string; slug: string; description: string; thumbnail: string; duration: string;
  views: number; likes: number; category: string; categorySlug: string;
  isFeatured?: boolean; publishedAt: string; videoUrl?: string | null;
};

export const CATEGORIES = [
  { name: "Short films", slug: "short-films", description: "Small running times. Big ideas.", thumbnail: "/images/video-hub-landscape.jpg" },
  { name: "Travel & adventure", slug: "travel-adventure", description: "A new perspective, somewhere new.", thumbnail: "/images/video-hub-landscape.jpg" },
  { name: "Music & live", slug: "music-live", description: "Turn it up. Feel every moment.", thumbnail: "/images/video-hub-landscape.jpg" },
  { name: "Life & culture", slug: "life-culture", description: "Extraordinary stories from everyday life.", thumbnail: "/images/video-hub-landscape.jpg" },
  { name: "Creative & design", slug: "creative-design", description: "A little inspiration goes a long way.", thumbnail: "/images/video-hub-landscape.jpg" },
  { name: "Learning", slug: "learning", description: "Follow your curiosity.", thumbnail: "/images/video-hub-landscape.jpg" },
];
// The library is populated exclusively by direct admin uploads. No external/demo videos.
export function formatViews(n: number) {
  return Intl.NumberFormat("en", { notation: n >= 1000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}
export function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (!Number.isFinite(diff) || diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}
