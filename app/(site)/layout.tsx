import Header from "@/components/Header";
import GitHubCommitBG from "@/components/GitHubCommitBG";

export default function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <GitHubCommitBG />
      <div className="relative z-10">
        <Header />
        {children}
      </div>
    </>
  );
}
