import { dayInAppTz, hourInAppTz } from "@/lib/date";
import { displayName, type AdminProfile, type Generation, type Vote } from "@/lib/types";

export type Scored = Generation & {
  score: number;
  upvotes: number;
  downvotes: number;
};

export type AuthorRow = {
  id: string;
  name: string;
  published: number;
  drafts: number;
  score: number;
  best: number;
};

export type DayRow = { day: string; captions: number; votes: number };

export function scoreGenerations(
  generations: Generation[],
  votes: Vote[]
): Map<string, Scored> {
  const scored = new Map<string, Scored>(
    generations.map((generation) => [
      generation.id,
      { ...generation, score: 0, upvotes: 0, downvotes: 0 },
    ])
  );

  for (const vote of votes) {
    const row = scored.get(vote.generation_id);
    if (!row) continue;
    row.score += vote.value;
    if (vote.value === 1) row.upvotes += 1;
    else row.downvotes += 1;
  }

  return scored;
}

export function buildStats(
  profiles: AdminProfile[],
  generations: Generation[],
  votes: Vote[]
) {
  const scored = scoreGenerations(generations, votes);
  const rows = [...scored.values()];

  const published = rows.filter((row) => row.published);
  const drafts = rows.filter((row) => !row.published);
  const house = published.filter((row) => row.is_house);
  const human = published.filter((row) => !row.is_house);

  // --- who wins each topic, humans or the house bot? ----------------------
  const byPrompt = new Map<number, Scored[]>();
  for (const row of published) {
    if (row.daily_prompt_id === null) continue;
    const list = byPrompt.get(row.daily_prompt_id) ?? [];
    list.push(row);
    byPrompt.set(row.daily_prompt_id, list);
  }

  let humanWins = 0;
  let houseWins = 0;
  for (const list of byPrompt.values()) {
    const contested = list.some((row) => row.is_house) && list.some((row) => !row.is_house);
    if (!contested) continue;
    const top = list.reduce((best, row) => (row.score > best.score ? row : best));
    if (top.is_house) houseWins += 1;
    else humanWins += 1;
  }

  const average = (list: Scored[]) =>
    list.length === 0
      ? 0
      : list.reduce((sum, row) => sum + row.score, 0) / list.length;

  // --- per-author leaderboard ----------------------------------------------
  const byAuthor = new Map<string, AuthorRow>();
  for (const profile of profiles) {
    byAuthor.set(profile.id, {
      id: profile.id,
      name: displayName(profile),
      published: 0,
      drafts: 0,
      score: 0,
      best: 0,
    });
  }
  for (const row of rows) {
    if (!row.user_id) continue;
    const author = byAuthor.get(row.user_id);
    if (!author) continue;
    if (row.published) {
      author.published += 1;
      author.score += row.score;
      author.best = Math.max(author.best, row.score);
    } else {
      author.drafts += 1;
    }
  }

  const authors = [...byAuthor.values()]
    .filter((author) => author.published + author.drafts > 0)
    .sort((a, b) => b.score - a.score || b.published - a.published);

  // --- activity by day ------------------------------------------------------
  const days = new Map<string, DayRow>();
  const touchDay = (day: string) =>
    days.get(day) ?? { day, captions: 0, votes: 0 };

  for (const row of published) {
    const day = dayInAppTz(row.created_at);
    const entry = touchDay(day);
    entry.captions += 1;
    days.set(day, entry);
  }
  for (const vote of votes) {
    const day = dayInAppTz(vote.created_at);
    const entry = touchDay(day);
    entry.votes += 1;
    days.set(day, entry);
  }

  const activity = [...days.values()].sort((a, b) => a.day.localeCompare(b.day));

  // --- activity by hour of day (New York) ----------------------------------
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  for (const row of rows) hours[hourInAppTz(row.created_at)].count += 1;
  for (const vote of votes) hours[hourInAppTz(vote.created_at)].count += 1;

  // --- the most divisive caption -------------------------------------------
  const divisive = published
    .filter((row) => row.upvotes > 0 && row.downvotes > 0)
    .sort(
      (a, b) =>
        Math.min(b.upvotes, b.downvotes) - Math.min(a.upvotes, a.downvotes)
    )[0];

  const topCaption = published
    .slice()
    .sort((a, b) => b.score - a.score)[0];

  // --- model mix ------------------------------------------------------------
  const models = new Map<string, number>();
  for (const row of rows) models.set(row.model, (models.get(row.model) ?? 0) + 1);

  const humansWhoPosted = new Set(
    human.map((row) => row.user_id).filter(Boolean)
  ).size;

  return {
    totals: {
      profiles: profiles.length,
      admins: profiles.filter((profile) => profile.is_superadmin).length,
      published: published.length,
      drafts: drafts.length,
      votes: votes.length,
      upvotes: votes.filter((vote) => vote.value === 1).length,
      topicsPlayed: byPrompt.size,
      humansWhoPosted,
    },
    /** Generations it takes to get one posted caption. */
    rerollRate: published.length === 0 ? 0 : rows.length / published.length,
    publishRate: rows.length === 0 ? 0 : published.length / rows.length,
    voteCoverage:
      published.length === 0
        ? 0
        : published.filter((row) => row.upvotes + row.downvotes > 0).length /
          published.length,
    humanVsHouse: {
      humanWins,
      houseWins,
      humanAverage: average(human),
      houseAverage: average(house),
      humanCount: human.length,
      houseCount: house.length,
    },
    authors,
    activity,
    hours,
    divisive,
    topCaption,
    models: [...models.entries()]
      .map(([model, count]) => ({ model, count }))
      .sort((a, b) => b.count - a.count),
  };
}

export type AdminStats = ReturnType<typeof buildStats>;
