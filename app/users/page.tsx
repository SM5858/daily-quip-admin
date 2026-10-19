import AdminNav from "@/components/admin-nav";
import PromoteButton from "@/components/promote-button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { requireSuperadmin } from "@/lib/auth";
import { getGenerations, getProfiles, getVotes } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/date";
import { displayName } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const { profile: me } = await requireSuperadmin();

  const [profiles, generations, votes] = await Promise.all([
    getProfiles(),
    getGenerations(),
    getVotes(),
  ]);

  const posted = new Map<string, number>();
  const drafted = new Map<string, number>();
  for (const row of generations) {
    if (!row.user_id) continue;
    const bucket = row.published ? posted : drafted;
    bucket.set(row.user_id, (bucket.get(row.user_id) ?? 0) + 1);
  }

  const cast = new Map<string, number>();
  for (const vote of votes) {
    cast.set(vote.user_id, (cast.get(vote.user_id) ?? 0) + 1);
  }

  return (
    <>
      <AdminNav profile={me} />

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <PageHeader
          eyebrow="Users"
          title="Profiles"
          description="Read-only, except for admin access. Profiles are created by the on_auth_user_created trigger when somebody signs in for the first time."
        />

        <Card
          title="Granting the first admin"
          hint="Why this page cannot be the only way in."
          className="mb-6"
        >
          <p className="text-sm leading-6 text-muted">
            Every route here requires{" "}
            <code className="font-mono text-foreground">
              profiles.is_superadmin
            </code>
            , so the first admin cannot be promoted from inside the app — that
            would be the hole this wall exists to close. It is set once in the
            Supabase SQL editor, a privileged channel the project owner already
            holds. From then on admins promote each other here, and{" "}
            <code className="font-mono text-foreground">
              admin_set_superadmin()
            </code>{" "}
            refuses to strip your own access, so the room cannot be locked from
            the inside.
          </p>
        </Card>

        {profiles.length === 0 ? (
          <EmptyState>No profiles yet.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {profiles.map((person) => (
              <li
                key={person.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-surface p-4"
              >
                {person.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.avatar_url}
                    alt=""
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold">
                    {displayName(person).slice(0, 1).toUpperCase()}
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    {displayName(person)}
                    {person.is_superadmin && <Badge tone="accent">admin</Badge>}
                    {!person.first_name && (
                      <Badge tone="warn">profile incomplete</Badge>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{person.email}</p>
                  <p className="mt-1 text-xs text-muted">
                    joined {formatDateTime(person.created_at)} ·{" "}
                    {posted.get(person.id) ?? 0} posted ·{" "}
                    {drafted.get(person.id) ?? 0} drafts ·{" "}
                    {cast.get(person.id) ?? 0} votes cast
                  </p>
                </div>

                <PromoteButton
                  id={person.id}
                  isAdmin={person.is_superadmin}
                  isSelf={person.id === me.id}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
