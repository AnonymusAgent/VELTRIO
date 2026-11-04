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
