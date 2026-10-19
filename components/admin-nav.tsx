import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { displayName, type AdminProfile } from "@/lib/types";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/media", label: "AI media" },
  { href: "/users", label: "Users" },
  { href: "/votes", label: "Votes" },
];

export default function AdminNav({ profile }: { profile: AdminProfile }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[11px] font-bold text-accent-contrast">
            DQ
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline">
            admin
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-4 overflow-x-auto text-sm text-muted [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-muted sm:inline">
            {displayName(profile)}
          </span>
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
            superadmin
          </span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-surface-2"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
