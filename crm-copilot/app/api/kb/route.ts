import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth/api";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  embedText,
  hasEmbeddingsProvider,
  toPgvectorLiteral,
} from "@/lib/ai/embeddings";

type CreateBody = {
  title?: string;
  content?: string;
};

export async function POST(request: Request) {
  const gate = await requireAdminFromRequest(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await request.json()) as CreateBody;
  const title = body.title?.trim() ?? "";
  const content = body.content?.trim() ?? "";

  if (!title || !content) {
    return NextResponse.json(
      { error: "title and content are required" },
      { status: 400 },
    );
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("kb_articles")
    .insert({ title, content })
    .select("id, title, content, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (hasEmbeddingsProvider() && data) {
    try {
      const embedding = await embedText(`${title}\n\n${content}`);
      await supabase
        .from("kb_articles")
        .update({ embedding: toPgvectorLiteral(embedding) })
        .eq("id", data.id);
    } catch (embedErr) {
      console.warn(
        "[/api/kb] embed failed (article saved):",
        embedErr instanceof Error ? embedErr.message : embedErr,
      );
    }
  }

  return NextResponse.json({ article: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const gate = await requireAdminFromRequest(request);
  if ("error" in gate) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("kb_articles").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
