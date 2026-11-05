export const ADMIN_EMAIL = "alimukhtar@veltrio.com";
export const LEGACY_ADMIN_EMAIL = "alomukhtar@playhub.vom";
export const CHUNK_SIZE = 4 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), 3);
  return `${(bytes / 1024 ** index).toFixed(index > 0 ? 1 : 0)} ${["B", "KB", "MB", "GB"][index]}`;
}

export type AdminVideo = {
  id: number;
  slug: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  status: string;
  categorySlug: string;
  categoryName: string;
  isFeatured: boolean;
  views: number;
  likes: number;
  duration: string;
  fileSize: number;
  createdAt: string;
  rightsConfirmed: boolean;
  muxStatus?: string | null;
  muxPlaybackId?: string | null;
};

export type AdminProfile = {
  email: string;
  name: string;
  mustChangePassword: boolean;
  introEnabled: boolean;
  passwordChangedAt: string;
  creatorSlug: string;
  creatorDisplayName: string;
  creatorBio: string;
};
