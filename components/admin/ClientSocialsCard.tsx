import { SocialLinkItem } from "@/components/shared/SocialLinks";

/** Read-only list of the social links a client added in their portal (for a right rail). */
export function ClientSocialsList({ links }: { links: string[] }) {
  if (links.length === 0) return <p className="text-[13px] text-fg-3">None added by the client yet</p>;
  return (
    <ul className="-mx-2 space-y-px">
      {links.map((url) => (
        <li key={url} className="flex">
          <SocialLinkItem url={url} />
        </li>
      ))}
    </ul>
  );
}
