import { SocialLinkItem } from "@/components/shared/SocialLinks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Read-only view of the social links a client added in their portal. */
export function ClientSocialsCard({ links }: { links: string[] }) {
  return (
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle>Socials</CardTitle>
          <CardDescription>Added by the client in their portal.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-white/35">None added yet</p>
        ) : (
          <ul className="space-y-2">
            {links.map((url) => (
              <li key={url} className="flex">
                <SocialLinkItem url={url} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
