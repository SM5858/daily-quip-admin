import AdminNav from "@/components/admin-nav";
import { Columns, GroupedColumns } from "@/components/charts";
import { Badge, Card, EmptyState, PageHeader, StatTile } from "@/components/ui";
import { requireSuperadmin } from "@/lib/auth";
import { getGenerations, getProfiles, getVotes } from "@/lib/admin-data";
import { formatDay } from "@/lib/date";
import { buildStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

const pct = (value: number) => `${Math.round(value * 100)}%`;

export default async function OverviewPage() {
  const { profile } = await requireSuperadmin();

  const [profiles, generations, votes] = await Promise.all([
    getProfiles(),
    getGenerations(),
    getVotes(),
  ]);

  const stats = buildStats(profiles, generations, votes);
  const { humanVsHouse: hvh, totals } = stats;

  const hourLabel = (hour: number) =>
    hour === 0 ? "12a" : hour === 12 ? "12p" : hour > 12 ? `${hour - 12}p` : `${hour}a`;

  const busiestHour = stats.hours.reduce((best, row) =>
    row.count > best.count ? row : best
  );

  return (
    <>
      <AdminNav profile={profile} />

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <PageHeader
          eyebrow="Overview"
          title="What the database is doing"
          description="Every number here is computed from rows this account can read through RLS — there is no service key in this app."
        />

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Profiles" value={totals.profiles} hint={`${totals.admins} admin`} />
          <StatTile label="Posted captions" value={totals.published} />
          <StatTile label="Unposted drafts" value={totals.drafts} />
          <StatTile label="Votes cast" value={totals.votes} hint={`${totals.upvotes} up`} />
          <StatTile label="Topics played" value={totals.topicsPlayed} />
          <StatTile label="People posting" value={totals.humansWhoPosted} />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <Card
            title="Rolls per keeper"
            hint="Generations spent for each caption that actually got posted."
          >
            <p className="text-4xl font-semibold tabular-nums">
              {stats.rerollRate.toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-muted">
              {pct(stats.publishRate)} of everything generated gets posted. The
              rest are drafts people rerolled past.
            </p>
          </Card>

          <Card
            title="Humans vs Quipbot"
            hint="Topics where both a person and the house bot posted."
          >
            {hvh.humanWins + hvh.houseWins === 0 ? (
              <p className="text-sm text-muted">
                No contested topic has finished yet.
              </p>
            ) : (
              <p className="text-4xl font-semibold tabular-nums">
                {hvh.humanWins}
                <span className="text-muted"> – </span>
                {hvh.houseWins}
              </p>
            )}
            <p className="mt-2 text-xs text-muted">
              Average score {hvh.humanAverage.toFixed(2)} for {hvh.humanCount}{" "}
              human captions vs {hvh.houseAverage.toFixed(2)} for{" "}
              {hvh.houseCount} house ones.
            </p>
          </Card>

          <Card title="Vote coverage" hint="Posted captions that got at least one vote.">
            <p className="text-4xl font-semibold tabular-nums">
              {pct(stats.voteCoverage)}
            </p>
            <p className="mt-2 text-xs text-muted">
              Anything at 0% is sitting on the board unseen — a reason to nudge
              the feed order.
            </p>
          </Card>
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <Card
            title="Captions and votes per day"
            hint="New York days, matching how the contest rolls over."
          >
            {stats.activity.length === 0 ? (
              <EmptyState>No activity recorded yet.</EmptyState>
            ) : (
              <GroupedColumns
                data={stats.activity.map((row) => ({
                  key: row.day,
                  values: [row.captions, row.votes] as [number, number],
                }))}
                labels={stats.activity.map((row) => formatDay(row.day))}
                seriesLabels={["Captions", "Votes"]}
              />
            )}
          </Card>

          <Card
            title="When the campus is awake"
            hint={`All activity by hour, New York time. Busiest: ${hourLabel(busiestHour.hour)}.`}
          >
            <Columns
              data={stats.hours.map((row) => ({
                key: String(row.hour),
                label: hourLabel(row.hour),
                value: row.count,
              }))}
              highlight={String(busiestHour.hour)}
            />
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Leaderboard" hint="Net score across every posted caption.">
            {stats.authors.length === 0 ? (
              <EmptyState>Nobody has written anything yet.</EmptyState>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="pb-2 font-medium">Person</th>
                    <th className="pb-2 text-right font-medium">Posted</th>
                    <th className="pb-2 text-right font-medium">Drafts</th>
                    <th className="pb-2 text-right font-medium">Best</th>
                    <th className="pb-2 text-right font-medium">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.authors.map((author) => (
                    <tr key={author.id} className="border-b border-line last:border-0">
                      <td className="py-2">{author.name}</td>
                      <td className="py-2 text-right tabular-nums">{author.published}</td>
                      <td className="py-2 text-right tabular-nums text-muted">{author.drafts}</td>
                      <td className="py-2 text-right tabular-nums">{author.best}</td>
                      <td className="py-2 text-right font-semibold tabular-nums">
                        {author.score > 0 ? `+${author.score}` : author.score}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <div className="flex flex-col gap-4">
            <Card title="Top caption of all time">
              {stats.topCaption ? (
                <>
                  <p className="text-sm leading-6">{stats.topCaption.content}</p>
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <Badge tone="ok">+{stats.topCaption.score}</Badge>
                    {stats.topCaption.topic}
                  </p>
                </>
              ) : (
                <EmptyState>Nothing posted yet.</EmptyState>
              )}
            </Card>

            <Card
              title="Most divisive caption"
              hint="The one with the most votes on both sides at once."
            >
              {stats.divisive ? (
                <>
                  <p className="text-sm leading-6">{stats.divisive.content}</p>
                  <p className="mt-3 flex items-center gap-2 text-xs text-muted">
                    <Badge tone="ok">{stats.divisive.upvotes} up</Badge>
                    <Badge tone="danger">{stats.divisive.downvotes} down</Badge>
                  </p>
                </>
              ) : (
                <EmptyState>Nothing has split the room yet.</EmptyState>
              )}
            </Card>

            <Card title="Models used">
              <ul className="flex flex-col gap-2 text-sm">
                {stats.models.map((row) => (
                  <li key={row.model} className="flex items-center justify-between">
                    <span className="font-mono text-xs">{row.model}</span>
                    <span className="tabular-nums text-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
