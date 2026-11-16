"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Briefcase,
  CircleHelp,
  Clock,
  FileText,
  FolderKanban,
  FolderUp,
  Globe,
  HardDrive,
  Inbox,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";

import { GoldLight } from "@/components/shared/GoldLight";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/client";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  clients: Users,
  projects: FolderKanban,
  time: Timer,
  hours: Clock,
  invoices: Receipt,
  requests: Inbox,
  files: FolderUp,
  settings: Settings,
  help: CircleHelp,
  briefcase: Briefcase,
  docs: FileText,
  site: Globe,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

export type NavItem = { title: string; href: string; icon: IconName; badge?: number; exact?: boolean };
export type NavGroup = { label?: string; items: NavItem[] };

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavBadge({ count }: { count?: number }) {
  if (!count || count <= 0) return null;
  return (
    <>
      <span className="ml-auto text-xs tabular-nums text-fg-3 group-data-[collapsible=icon]:hidden">{count > 99 ? "99+" : count}</span>
      <span aria-hidden className="absolute right-1.5 top-1.5 hidden size-1.5 rounded-full bg-accent group-data-[collapsible=icon]:block" />
    </>
  );
}

/** Closes the mobile sidebar sheet after navigating. */
function CloseOnNavigate({ pathname }: { pathname: string }) {
  const { setOpenMobile } = useSidebar();
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);
  return null;
}

export function AppShell({
  area,
  groups,
  user,
  storageUrl,
  topbar,
  banner,
  children,
}: {
  area: "Admin" | "Client Portal";
  groups: NavGroup[];
  user: { name: string; email: string; image?: string | null };
  /** Admin only: adds a link to the file storage server in the account menu. */
  storageUrl?: string;
  topbar?: React.ReactNode;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <SidebarProvider className="leading-normal">
      <Sidebar collapsible="icon" variant="inset" className="border-r-0">
        <SidebarHeader className="px-2 pb-1 pt-3">
          <Link
            href={area === "Admin" ? "/admin" : "/portal"}
            className="flex h-9 items-center gap-2 overflow-hidden rounded-md px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <span className="text-lg font-semibold leading-none">
              L<span className="group-data-[collapsible=icon]:hidden">uke</span>
              <span className="text-accent">.</span>
            </span>
            <span className="truncate text-xs text-fg-3 group-data-[collapsible=icon]:hidden">{area === "Admin" ? "Admin" : "Client portal"}</span>
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {groups.map((group, gi) => (
            <SidebarGroup key={gi} className="py-1.5">
              {group.label && <SidebarGroupLabel className="h-7 px-2 text-[11px] font-normal text-fg-3">{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu className="gap-px">
                  {group.items.map((item) => {
                    const Icon = ICONS[item.icon];
                    const active = isActive(pathname, item);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className={cn(
                            "relative h-8 rounded-md text-[13px] text-fg-2 transition-colors hover:bg-white/[0.04] hover:text-white",
                            "data-[active=true]:bg-white/[0.07] data-[active=true]:font-medium data-[active=true]:text-white",
                          )}
                        >
                          <Link href={item.href}>
                            <Icon className="!size-4" strokeWidth={1.75} />
                            <span>{item.title}</span>
                            <NavBadge count={item.badge} />
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full cursor-pointer items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                <Avatar className="size-7">
                  {user.image && <AvatarImage src={user.image} alt="" />}
                  <AvatarFallback className="bg-white/[0.08] text-[11px] font-medium text-white">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="block truncate text-[13px] text-white">{user.name}</span>
                  <span className="block truncate text-xs text-fg-3">{user.email}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-60">
              <DropdownMenuLabel className="truncate text-xs font-normal text-fg-3">{user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href={area === "Admin" ? "/admin/settings" : "/portal/settings"}>
                  <Settings /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/">
                  <Globe /> lukebaber.com
                </Link>
              </DropdownMenuItem>
              {storageUrl && (
                <DropdownMenuItem asChild className="cursor-pointer">
                  <a href={storageUrl} target="_blank" rel="noreferrer">
                    <HardDrive /> {new URL(storageUrl).host}
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/[0.06]" />
              <DropdownMenuItem onSelect={signOut} className="cursor-pointer text-danger focus:bg-danger/10 focus:text-danger">
                <LogOut className="text-danger" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background md:border md:border-line md:peer-data-[variant=inset]:rounded-lg md:peer-data-[variant=inset]:shadow-none">
        {banner}
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-background/90 px-3 backdrop-blur-sm md:rounded-t-lg md:px-4">
          <SidebarTrigger className="size-8 shrink-0 text-fg-3 hover:bg-white/[0.06] hover:text-white" />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">{topbar}</div>
        </header>
        <CloseOnNavigate pathname={pathname} />
        <GoldLight />
        <div key={pathname} className="app-enter mx-auto w-full max-w-[1200px] px-4 py-6 md:px-8 md:py-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
