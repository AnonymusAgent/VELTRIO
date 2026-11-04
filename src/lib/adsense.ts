export const adsenseConfig = {
  client: process.env.NEXT_PUBLIC_ADSENSE_CLIENT || "",
  slots: {
    header: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER || "",
    sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || "",
    inFeed: process.env.NEXT_PUBLIC_ADSENSE_SLOT_INFEED || "",
    video: process.env.NEXT_PUBLIC_ADSENSE_SLOT_VIDEO || "",
    footer: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER || "",
    responsive: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESPONSIVE || "",
  },
  isConfigured: Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT),
};

export const AD_SLOTS = {
  HEADER_LEADERBOARD: { name: "Header Leaderboard", size: "728 × 90", slotKey: "header" as const, format: "horizontal" },
  SIDEBAR_RECTANGLE: { name: "Sidebar Rectangle", size: "300 × 250", slotKey: "sidebar" as const, format: "rectangle" },
  IN_FEED: { name: "In-Feed Native", size: "Responsive", slotKey: "inFeed" as const, format: "fluid" },
  VIDEO_PAGE: { name: "Video Page Banner", size: "728 × 90", slotKey: "video" as const, format: "horizontal" },
  FOOTER: { name: "Footer Banner", size: "728 × 90", slotKey: "footer" as const, format: "horizontal" },
  RESPONSIVE: { name: "Responsive Auto", size: "Responsive", slotKey: "responsive" as const, format: "auto" },
};
