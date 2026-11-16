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

/** One saved link as a compact clickable row: platform logo, name (or domain), external arrow. */
export function SocialLinkItem({ url, className }: { url: string; className?: string }) {
  const platform = detectPlatform(url);
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group flex h-8 min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 text-[13px] text-fg-2 transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50",
        className,
      )}
    >
      <SocialIcon url={url} className="size-3.5 shrink-0 text-fg-3 group-hover:text-white" />
      {/* Unrecognised sites show their domain so two "Website" rows stay distinguishable. */}
      <span className="min-w-0 flex-1 truncate">
        {platform.id === "website" ? (hostOf(url)?.replace(/^www\./, "") ?? platform.label) : platform.label}
      </span>
      <ArrowUpRight className="size-3.5 shrink-0 text-fg-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
    </a>
  );
}
