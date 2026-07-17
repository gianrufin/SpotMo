export type OrganizerStatus = 'pending' | 'approved' | 'revoked';

/** A row in the `organizers` roster table (shape matches the DB columns). */
export interface OrganizerRow {
  id: string;
  email: string;
  org_name: string | null;
  status: OrganizerStatus;
  user_id: string | null;
  requested_at: string;
  reviewed_at: string | null;
  created_by: 'request' | 'admin';
  request_note: string | null;
  instagram_url: string | null;
}

export interface OrganizerStatusCheck {
  status: OrganizerStatus | 'none';
  has_account: boolean;
}
