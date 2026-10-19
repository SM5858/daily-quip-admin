export type AdminProfile = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_superadmin: boolean;
  created_at: string;
};

export type Generation = {
  id: string;
  user_id: string | null;
  daily_prompt_id: number | null;
  topic: string;
  user_input: string | null;
  prompt: string;
  model: string;
  content: string;
  is_house: boolean;
  published: boolean;
  created_at: string;
};

export type Vote = {
  id: string;
  generation_id: string;
  user_id: string;
  value: 1 | -1;
  created_at: string;
};

export type DailyPrompt = {
  id: number;
  prompt_date: string;
  topic: string;
};

export function displayName(profile: {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}) {
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(" ");
  return name || profile.email || "Unnamed";
}
