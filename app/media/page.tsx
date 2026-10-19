import AdminNav from "@/components/admin-nav";
import MediaCreate from "@/components/media-create";
import MediaRow from "@/components/media-row";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireSuperadmin } from "@/lib/auth";
import { getGenerations, getProfiles, getPrompts, getVotes } from "@/lib/admin-data";
import { scoreGenerations } from "@/lib/stats";
import { displayName } from "@/lib/types";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "published", label: "Published" },
  { key: "draft", label: "Drafts" },
  { key: "house", label: "House" },
  { key: "human", label: "Human" },
] as const;

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { profile } = await requireSuperadmin();
  const params = await searchParams;
  const filter = typeof params.filter === "string" ? params.filter : "all";

  const [generations, votes, profiles, prompts] = await Promise.all([
    getGenerations(),
    getVotes(),
    getProfiles(),
    getPrompts(),
  ]);

  const scored = [...scoreGenerations(generations, votes).values()];
  const authors = new Map(profiles.map((row) => [row.id, displayName(row)]));

  const visible = scored.filter((item) => {
    if (filter === "published") return item.published;
    if (filter === "draft") return !item.published;
    if (filter === "house") return item.is_house;
    if (filter === "human") return !item.is_house;
    return true;
  });

  return (
    <>
      <AdminNav profile={profile} />

      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <PageHeader
          eyebrow="AI media"
          title="Captions"
          description="Create, edit, publish and delete the AI generated captions. Drafts are the ones their author never posted."
        />

        <Card title="New caption" className="mb-6">
          <MediaCreate prompts={prompts} />
        </Card>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {FILTERS.map((option) => (
            <Link
              key={option.key}
              href={option.key === "all" ? "/media" : `/media?filter=${option.key}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                filter === option.key
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-muted hover:bg-surface-2"
              }`}
            >
              {option.label}
            </Link>
          ))}
          <span className="ml-auto text-xs text-muted">
            {visible.length} of {scored.length}
          </span>
        </div>

        {visible.length === 0 ? (
          <EmptyState>Nothing matches this filter.</EmptyState>
        ) : (
          <ul className="flex flex-col gap-3">
            {visible.map((item) => (
              <MediaRow
                key={item.id}
                item={item}
                author={
                  item.is_house
                    ? "Quipbot"
                    : (item.user_id && authors.get(item.user_id)) || "Unknown"
                }
              />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
