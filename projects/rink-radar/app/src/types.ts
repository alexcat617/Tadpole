export type Activity = 'public_skate' | 'adult_hockey' | 'stick_puck' | 'other';

export interface Rink {
  id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  postal_code: string;
  lat: number;
  lng: number;
  phone?: string;
  website: string;
  status: string;
  /** Curated facility status for the directory drawer; overrides scrape health badge when set. */
  operations?: {
    status: 'closed_for_season' | 'open';
    label?: string;
  };
}

export interface Session {
  id: string;
  rink_id: string;
  activity: Activity;
  subtype?: string;
  starts_at: string;
  ends_at: string;
  price?: {
    summary: string;
    amount_cents?: number;
    currency: string;
    is_free: boolean;
  };
  raw_label?: string;
  source_url: string;
  fetched_at: string;
  confidence?: string;
}

export interface SessionsFile {
  generated_at: string;
  region_label: string;
  sessions: Session[];
}

export interface RinksFile {
  region: {
    label: string;
    anchor: { lat: number; lng: number; postal_code: string; city?: string; region?: string };
    default_radius_km: number;
  };
  rinks: Rink[];
}

export type RinkHealthEntry = {
  ok: boolean;
  session_count?: number;
  error?: string;
};

export interface HealthFile {
  generated_at: string;
  rinks: Record<string, RinkHealthEntry>;
}

export interface BruinsGame {
  id: string;
  starts_at: string;
  opponent_abbr: string;
  opponent_name: string;
  is_home: boolean;
  venue: string;
  game_state: string;
  tv_networks: string[];
}

export interface BruinsScheduleFile {
  team_label?: string;
  season_label: string;
  season_slug: string;
  generated_at: string;
  source_url: string;
  games: BruinsGame[];
  error?: string;
}

/** Same game list shape as Bruins companion (UNH Wildcats, etc.). */
export type CompanionScheduleFile = BruinsScheduleFile;

export type ProgramKind = 'drop_in' | 'league' | 'skills';

export interface ProgramLink {
  label: string;
  url: string;
}

export interface ProgramOffering {
  label: string;
  schedule_text: string;
  exceptions?: string[];
  times_text: string;
  cost_text: string;
  registration_text: string;
}

export type ProgramAudience = 'youth' | 'adult' | 'family';

export interface Program {
  id: string;
  rink_id: string;
  title: string;
  kind: ProgramKind;
  /** Defaults to adult when omitted (legacy JSON). */
  audience?: ProgramAudience;
  description: string;
  offerings: ProgramOffering[];
  links?: ProgramLink[];
}

export interface ProgramsFile {
  generated_at: string;
  source_url: string;
  programs: Program[];
}
