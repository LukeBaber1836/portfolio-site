"use client";

import Link from "next/link";
import { Fragment, useEffect } from "react";
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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  // transitions.dev "Notification badge": slides + pops in when count > 0.
  const open = !!count && count > 0;
  return (
    <span className="t-badge !static ml-auto group-data-[collapsible=icon]:!absolute group-data-[collapsible=icon]:!-right-1 group-data-[collapsible=icon]:!-top-1" data-open={open}>
      <span className="t-badge-dot flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-background">
        {open ? (count! > 99 ? "99+" : count) : ""}
      </span>
    </span>
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

const CRUMB_LABELS: Record<string, string> = {
  clients: "Clients",
  new: "New",
  projects: "Projects",
  time: "Time",
  hours: "Hours",
  invoices: "Invoices",
  requests: "Requests",
  files: "Files",
  settings: "Settings",
};

function prettySegment(seg: string) {
  if (/^[0-9a-f]{8}-[0-9a-f-]*$/i.test(seg) || /^c[a-z0-9]{10,}$/i.test(seg)) return "Details";
  return CRUMB_LABELS[seg] ?? seg.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Auto-derived breadcrumb: Area / section / … — no per-page wiring needed. */
function AreaBreadcrumb({ area, pathname }: { area: "Admin" | "Client Portal"; pathname: string }) {
  const root = area === "Admin" ? "/admin" : "/portal";
  const segs = pathname.replace(root, "").split("/").filter(Boolean);
  if (segs.length === 0) return null;
  return (
    <Breadcrumb className="hidden min-w-0 sm:block">
      <BreadcrumbList className="flex-nowrap whitespace-nowrap">
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href={root}>{area}</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {segs.map((seg, i) => {
          const last = i === segs.length - 1;
          const href = `${root}/${segs.slice(0, i + 1).join("/")}`;
          return (
            <Fragment key={`${seg}-${i}`}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {last ? (
                  <BreadcrumbPage className="truncate">{prettySegment(seg)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{prettySegment(seg)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
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
    <SidebarProvider>
      <Sidebar collapsible="icon" className="border-r border-sidebar-border">
        <SidebarHeader className="px-3 pb-2 pt-5">
          <Link href={area === "Admin" ? "/admin" : "/portal"} className="flex items-center gap-2 overflow-hidden px-1">
            <span className="text-2xl font-semibold leading-none">
              L<span className="group-data-[collapsible=icon]:hidden">uke</span>
              <span className="text-accent">.</span>
            </span>
            <span className="mt-1 truncate rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-accent group-data-[collapsible=icon]:hidden">
              {area}
            </span>
          </Link>
        </SidebarHeader>

        <SidebarContent className="px-1">
          {groups.map((group, gi) => (
            <SidebarGroup key={gi}>
              {group.label && <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-white/30">{group.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu className="gap-1">
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
                            "h-10 rounded-xl text-white/65 transition-all duration-200 hover:bg-white/5 hover:text-white",
                            "data-[active=true]:bg-white/[0.06] data-[active=true]:font-semibold data-[active=true]:text-accent",
                          )}
                        >
                          <Link href={item.href}>
                            <Icon className="!size-[18px]" />
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

        <SidebarFooter className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full cursor-pointer items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0">
                <Avatar className="size-8 border border-white/10">
                  {user.image && <AvatarImage src={user.image} alt="" />}
                  <AvatarFallback className="bg-accent/15 text-xs font-semibold text-accent">{initials(user.name)}</AvatarFallback>
                </Avatar>
                <span className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                  <span className="block truncate text-sm font-medium text-white">{user.name}</span>
                  <span className="block truncate text-xs text-white/40">{user.email}</span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-60 rounded-xl border-white/10 bg-popover p-1.5">
              <DropdownMenuLabel className="text-xs font-normal text-white/50">Signed in as {user.email}</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg focus:bg-white/5 focus:text-accent">
                <Link href={area === "Admin" ? "/admin/settings" : "/portal/settings"}>
                  <Settings /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer rounded-lg focus:bg-white/5 focus:text-accent">
                <Link href="/">
                  <Globe /> lukebaber.com
                </Link>
              </DropdownMenuItem>
              {storageUrl && (
                <DropdownMenuItem asChild className="cursor-pointer rounded-lg focus:bg-white/5 focus:text-accent">
                  <a href={storageUrl} target="_blank" rel="noreferrer">
                    <HardDrive /> {new URL(storageUrl).host}
                  </a>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/5" />
              <DropdownMenuItem onSelect={signOut} className="cursor-pointer rounded-lg text-danger focus:bg-danger/10 focus:text-danger">
                <LogOut className="text-danger" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-w-0 bg-background">
        {banner}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/5 bg-background/80 px-4 backdrop-blur-md md:px-6">
          <SidebarTrigger className="-ml-1 shrink-0 text-white/60 hover:text-accent" />
          <div className="h-5 w-px shrink-0 bg-white/10" />
          <AreaBreadcrumb area={area} pathname={pathname} />
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">{topbar}</div>
        </header>
        <CloseOnNavigate pathname={pathname} />
        <div key={pathname} className="app-enter mx-auto w-full max-w-[1200px] px-4 py-8 md:px-6 lg:px-8">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
