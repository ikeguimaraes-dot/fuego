import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { serverDb } from "@/lib/server";
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  let sameOrigin = false;
  try {
    const parsed = new URL(origin || "");
    sameOrigin = ["https:", "http:"].includes(parsed.protocol) && parsed.host === request.headers.get("host");
  } catch { /* Missing or malformed origins are rejected. */ }
  if (!sameOrigin)
    return NextResponse.json({ error: "Origem inválida." }, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 2048)
      return NextResponse.json(
        { error: "Solicitação muito grande." },
        { status: 413 },
      );
    let payload;
    try { payload = JSON.parse(body); } catch {
      return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
    }
    if (!payload || typeof payload !== "object") return NextResponse.json({ error: "Solicitação inválida." }, { status: 400 });
    const { pollId, optionId, email, website } = payload;
    if (
      website ||
      typeof email !== "string" ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !/^[0-9a-f-]{36}$/i.test(pollId) ||
      !/^[0-9a-f-]{36}$/i.test(optionId)
    )
      return NextResponse.json(
        { error: "Confira seu e-mail e escolha um cardápio." },
        { status: 400 },
      );
    const secret = process.env.VOTE_HASH_SECRET;
    if (!secret) throw new Error("Missing secret");
    const hash = (s: string) =>
      createHmac("sha256", secret).update(s).digest("hex");
    const ip =
      request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      "local";
    const { error } = await serverDb().rpc("fuego_cast_vote", {
      p_poll: pollId,
      p_option: optionId,
      p_voter: hash(email.trim().toLowerCase()),
      p_ip: hash(ip),
    });
    if (error) {
      if (error.code === "23505")
        return NextResponse.json(
          { error: "Este e-mail já participou desta votação." },
          { status: 409 },
        );
      if (error.message.includes("rate_limit"))
        return NextResponse.json(
          {
            error: "Muitas tentativas. Aguarde uma hora para tentar novamente.",
          },
          { status: 429 },
        );
      if (error.message.includes("poll_unavailable"))
        return NextResponse.json(
          { error: "Esta votação já foi encerrada. Atualize a página." },
          { status: 409 },
        );
      throw error;
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível registrar seu voto. Tente novamente." },
      { status: 503 },
    );
  }
}
