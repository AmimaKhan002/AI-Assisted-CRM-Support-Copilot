"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Ticket } from "@/lib/types/ticket";

export type RealtimeStatus =
  | "connecting"
  | "subscribed"
  | "channel_error"
  | "timed_out"
  | "closed";

export function useTicketsRealtime(
  setTickets: React.Dispatch<React.SetStateAction<Ticket[]>>,
) {
  const [status, setStatus] = useState<RealtimeStatus>("connecting");

  useEffect(() => {
    const supabase = createBrowserClient();

    const channel = supabase
      .channel("tickets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tickets" },
        (payload) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            const row = payload.new as Ticket;
            setTickets((prev) =>
              prev.map((t) => (t.id === row.id ? { ...t, ...row } : t)),
            );
            return;
          }

          if (payload.eventType === "INSERT" && payload.new) {
            const row = payload.new as Ticket;
            setTickets((prev) => {
              if (prev.some((t) => t.id === row.id)) return prev;
              return [row, ...prev];
            });
            return;
          }

          if (payload.eventType === "DELETE" && payload.old) {
            const old = payload.old as { id?: string };
            if (!old.id) return;
            setTickets((prev) => prev.filter((t) => t.id !== old.id));
          }
        },
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === "SUBSCRIBED") {
          setStatus("subscribed");
        } else if (subscribeStatus === "CHANNEL_ERROR") {
          setStatus("channel_error");
        } else if (subscribeStatus === "TIMED_OUT") {
          setStatus("timed_out");
        } else if (subscribeStatus === "CLOSED") {
          setStatus("closed");
        } else {
          setStatus("connecting");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [setTickets]);

  return status;
}
