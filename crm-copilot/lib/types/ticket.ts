export type TicketStatus = "open" | "in_progress" | "resolved";

export type Ticket = {
  id: string;
  subject: string;
  body: string;
  status: TicketStatus;
  summary: string | null;
  suggested_reply: string | null;
  created_at: string;
};
