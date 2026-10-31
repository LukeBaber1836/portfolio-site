/**
 * Client social links. Only URLs are stored — the platform (label + icon) is
 * derived from the hostname at render time, so new platforms light up for
 * links that were saved before they were added here.
 */

export const SOCIAL_PLATFORMS = [
  { id: "x", label: "X", hosts: ["x.com", "twitter.com"] },
  { id: "facebook", label: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me"] },
  { id: "instagram", label: "Instagram", hosts: ["instagram.com", "instagr.am"] },
  { id: "tiktok", label: "TikTok", hosts: ["tiktok.com"] },
  { id: "linkedin", label: "LinkedIn", hosts: ["linkedin.com", "lnkd.in"] },
  { id: "youtube", label: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { id: "github", label: "GitHub", hosts: ["github.com"] },
  { id: "threads", label: "Threads", hosts: ["threads.net", "threads.com"] },
  { id: "bluesky", label: "Bluesky", hosts: ["bsky.app"] },
  { id: "pinterest", label: "Pinterest", hosts: ["pinterest.com", "pin.it"] },
  { id: "snapchat", label: "Snapchat", hosts: ["snapchat.com"] },
  { id: "reddit", label: "Reddit", hosts: ["reddit.com"] },
  { id: "discord", label: "Discord", hosts: ["discord.gg", "discord.com"] },
  { id: "twitch", label: "Twitch", hosts: ["twitch.tv"] },
  { id: "mastodon", label: "Mastodon", hosts: ["mastodon.social", "mastodon.online", "mstdn.social"] },
  { id: "dribbble", label: "Dribbble", hosts: ["dribbble.com"] },
  { id: "behance", label: "Behance", hosts: ["behance.net"] },
  { id: "medium", label: "Medium", hosts: ["medium.com"] },
  { id: "substack", label: "Substack", hosts: ["substack.com"] },
  { id: "spotify", label: "Spotify", hosts: ["spotify.com"] },
  { id: "soundcloud", label: "SoundCloud", hosts: ["soundcloud.com"] },
  { id: "vimeo", label: "Vimeo", hosts: ["vimeo.com"] },
  { id: "patreon", label: "Patreon", hosts: ["patreon.com"] },
  { id: "etsy", label: "Etsy", hosts: ["etsy.com"] },
  { id: "yelp", label: "Yelp", hosts: ["yelp.com"] },
  { id: "whatsapp", label: "WhatsApp", hosts: ["wa.me", "whatsapp.com"] },
  { id: "telegram", label: "Telegram", hosts: ["t.me", "telegram.me"] },
  { id: "google", label: "Google Business", hosts: ["g.page", "business.google.com", "maps.app.goo.gl"] },
] as const;

export type SocialPlatformId = (typeof SOCIAL_PLATFORMS)[number]["id"] | "website";
export type SocialPlatform = { id: SocialPlatformId; label: string };

export const MAX_SOCIAL_LINKS = 20;

const WEBSITE: SocialPlatform = { id: "website", label: "Website" };

/** Matches the hostname (and any subdomain of it) to a known platform; anything else is a plain website. */
export function detectPlatform(url: string): SocialPlatform {
  let host: string;
  try {
    host = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return WEBSITE;
  }
  const match = SOCIAL_PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`)));
  return match ? { id: match.id, label: match.label } : WEBSITE;
}
