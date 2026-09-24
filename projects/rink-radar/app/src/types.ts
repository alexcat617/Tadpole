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
