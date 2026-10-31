import { ArrowUpRight, Globe } from "lucide-react";
import type { IconType } from "react-icons";
import {
  FaBehance,
  FaBluesky,
  FaDiscord,
  FaDribbble,
  FaEtsy,
  FaFacebook,
  FaGithub,
  FaGoogle,
  FaInstagram,
  FaLinkedin,
  FaMastodon,
  FaMedium,
  FaPatreon,
  FaPinterest,
  FaReddit,
  FaSnapchat,
  FaSoundcloud,
  FaSpotify,
  FaTelegram,
  FaThreads,
  FaTiktok,
  FaTwitch,
  FaVimeoV,
  FaWhatsapp,
  FaXTwitter,
  FaYelp,
  FaYoutube,
} from "react-icons/fa6";
import { SiSubstack } from "react-icons/si";

import { hostOf } from "@/lib/references/preview";
import { detectPlatform, type SocialPlatformId } from "@/lib/socials";
import { cn } from "@/lib/utils";

const ICONS: Record<SocialPlatformId, IconType> = {
  x: FaXTwitter,
  facebook: FaFacebook,
  instagram: FaInstagram,
  tiktok: FaTiktok,
  linkedin: FaLinkedin,
  youtube: FaYoutube,
  github: FaGithub,
  threads: FaThreads,
  bluesky: FaBluesky,
  pinterest: FaPinterest,
  snapchat: FaSnapchat,
  reddit: FaReddit,
  discord: FaDiscord,
  twitch: FaTwitch,
  mastodon: FaMastodon,
  dribbble: FaDribbble,
  behance: FaBehance,
  medium: FaMedium,
  substack: SiSubstack,
  spotify: FaSpotify,
  soundcloud: FaSoundcloud,
  vimeo: FaVimeoV,
  patreon: FaPatreon,
  etsy: FaEtsy,
  yelp: FaYelp,
  whatsapp: FaWhatsapp,
  telegram: FaTelegram,
  google: FaGoogle,
  website: Globe,
};

/** Platform logo picked from the link's hostname. */
export function SocialIcon({ url, className }: { url: string; className?: string }) {
  const Icon = ICONS[detectPlatform(url).id];
  return <Icon className={cn("size-4", className)} aria-hidden />;
}

/** One saved link as a clickable row: logo chip, platform name, and handle. */
export function SocialLinkItem({ url, className }: { url: string; className?: string }) {
  const platform = detectPlatform(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-accent/5",
        className,
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/70 group-hover:text-accent">
        <SocialIcon url={url} />
      </span>
      {/* Unrecognised sites show their domain so two "Website" rows stay distinguishable. */}
      <span className="min-w-0 flex-1 truncate text-sm text-white group-hover:text-accent">
        {platform.id === "website" ? (hostOf(url)?.replace(/^www\./, "") ?? platform.label) : platform.label}
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-white/30 group-hover:text-accent" aria-hidden />
    </a>
  );
}
