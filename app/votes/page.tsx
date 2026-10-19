import AdminNav from "@/components/admin-nav";
import { Badge, EmptyState, PageHeader, StatTile } from "@/components/ui";
import { requireSuperadmin } from "@/lib/auth";
import { getGenerations, getProfiles, getVotes } from "@/lib/admin-data";
import { formatDateTime } from "@/lib/date";
import { displayName } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function VotesPage() {
  const { profile } = await requireSuperadmin();

  const [votes, generations, profiles] = await Promise.all([
    getVotes(),
    getGenerations(),
    getProfiles(),
  ]);

  const captions = new Map(generations.map((row) => [row.id, row]));
  const people = new Map(profiles.map((row) => [row.id, displayName(row)]));

  const up = votes.filter((vote) => vote.value === 1).length;
  const down = votes.length - up;
  const voters = new Set(votes.map((vote) => vote.user_id)).size;

  return (
    <>
      <AdminNav profile={profile} />

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <PageHeader
          eyebrow="Votes"
          title="Every ballot"
          description="Read-only. In the public app a member can only ever see their own votes — this page exists because admins hold a separate read policy."
        />

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Total" value={votes.length} />
          <StatTile label="Upvotes" value={up} />
          <StatTile label="Downvotes" value={down} />
          <StatTile label="Distinct voters" value={voters} />
        </div>

        {votes.length === 0 ? (
          <EmptyState>Nobody has voted yet.</EmptyState>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-surface">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-4 py-3 font-medium">Vote</th>
                  <th className="px-4 py-3 font-medium">Voter</th>
                  <th className="px-4 py-3 font-medium">Caption</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((vote) => {
                  const caption = captions.get(vote.generation_id);
                  return (
                    <tr key={vote.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">
                        {vote.value === 1 ? (
                          <Badge tone="ok">up</Badge>
                        ) : (
                          <Badge tone="danger">down</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {people.get(vote.user_id) ?? (
                          <span className="text-muted">unknown</span>
                        )}
                      </td>
                      <td className="max-w-md px-4 py-3">
                        <span className="line-clamp-2 text-muted">
                          {caption?.content ?? "(deleted)"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted">
                        {formatDateTime(vote.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
