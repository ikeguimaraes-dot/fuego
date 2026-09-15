import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const db = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data, error } = await db
      .from("fuego_polls")
      .select("*, fuego_options(*)")
      .eq("status", "open")
      .gt("closes_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (data)
      data.fuego_options.sort(
        (a: { position: number }, b: { position: number }) =>
          a.position - b.position,
      );
    return NextResponse.json(
      { poll: data },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar a votação. Tente novamente." },
      { status: 503 },
    );
  }
}
