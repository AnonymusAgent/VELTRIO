import RequestForm from "@/components/RequestForm";
export const metadata = { title: "Contact" };
export default function ContactPage() { return <div className="site-container max-w-[860px] py-14"><span className="eyebrow text-[#b88375]">LET'S TALK</span><h1 className="mt-4 text-4xl">A note to the studio.</h1><p className="my-6 text-sm leading-7 text-zinc-500">Questions, feedback or a privacy request? Leave a message for the Video Hub administrator. Do not include passwords or recovery codes.</p><RequestForm /></div>; }
