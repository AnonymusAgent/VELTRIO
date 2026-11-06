import { getAccountWatching, getPublicVideos, isContinuing, type AccountWatch } from "@/lib/video-store";
import { listSavedSlugs } from "@/lib/saved-titles";
import { userAuth } from "@/lib/user-auth";
import VideoBrowser from "@/components/VideoBrowser";
import CatalogUnavailable from "@/components/CatalogUnavailable";
export const dynamic = "force-dynamic";
export const metadata = { title: "My list" };
export default async function MyList() {
  let videos: Awaited<ReturnType<typeof getPublicVideos>> | null = null;
  let watching: AccountWatch[] = [];
  let accountSaved: string[] = [];
  try { videos = await getPublicVideos(); } catch { /* A service failure is not an empty list. */ }
  try {
    const user = (await userAuth().getSession()).data?.user;
    if (user?.id) {
      [watching, accountSaved] = await Promise.all([getAccountWatching(user.id), listSavedSlugs(user.id)]);
    }
  } catch { /* Signed-out viewing still uses this browser. */ }
  const accountHistory = watching.map(item => item.slug);
  const accountContinue = watching.filter(isContinuing).map(item => item.slug);
  return <div className="site-container pb-20"><div className="browse-heading premium-page-heading"><span className="section-kicker">YOUR PERSONAL LIBRARY</span><h1>Made for later.</h1><p>Sign in and My List follows your account. On this browser it stays either way.</p></div>{videos ? <VideoBrowser videos={videos} savedOnly accountHistory={accountHistory} accountContinue={accountContinue} accountSaved={accountSaved} /> : <CatalogUnavailable />}</div>;
}
