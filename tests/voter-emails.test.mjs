import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .trim()
    .split("\n")
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);
const create = (key) =>
  createClient(env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false },
  });
const service = create(env.SUPABASE_SERVICE_ROLE_KEY),
  anon = create(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
test("Admin-only voter emails, legacy entries and pagination without publishing test polls", async () => {
  let uid, pollId, browser;
  const email = `fuego-qa-${randomUUID()}@example.com`,
    password = randomBytes(24).toString("hex"),
    title = `QA email visibility ${randomUUID()}`;
  try {
    const account = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.ifError(account.error);
    uid = account.data.user.id;
    const user = create(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    assert.ifError(
      (await user.auth.signInWithPassword({ email, password })).error,
    );
    const p = await service
      .from("fuego_polls")
      .insert({
        title,
        week_start: "2026-10-05",
        closes_at: new Date(Date.now() + 86400000).toISOString(),
      })
      .select("id")
      .single();
    assert.ifError(p.error);
    pollId = p.data.id;
    const option = await service
      .from("fuego_options")
      .insert({
        poll_id: pollId,
        title: "Cardápio QA",
        dishes: ["Prato QA"],
        tag: "QA",
      })
      .select("id")
      .single();
    assert.ifError(option.error);
    const votes = Array.from({ length: 52 }, (_, i) => ({
      poll_id: pollId,
      option_id: option.data.id,
      voter_hash: randomBytes(32).toString("hex"),
      ip_hash: randomBytes(32).toString("hex"),
      voter_email:
        i === 51 ? null : `votante-${String(i).padStart(2, "0")}@example.com`,
      created_at: new Date(Date.now() - i * 1000).toISOString(),
    }));
    assert.ifError((await service.from("fuego_votes").insert(votes)).error);
    const publicRead = await anon
      .from("fuego_votes")
      .select("voter_email")
      .eq("poll_id", pollId);
    assert.ok(publicRead.error);
    const denied = await user
      .from("fuego_votes")
      .select("voter_email")
      .eq("poll_id", pollId);
    assert.ifError(denied.error);
    assert.deepEqual(denied.data, []);
    const rpc = await user.rpc("fuego_cast_vote_with_email", {
      p_poll: pollId,
      p_option: option.data.id,
      p_voter: "a".repeat(64),
      p_ip: "b".repeat(64),
      p_email: "test@example.com",
    });
    assert.ok(rpc.error);
    assert.ifError(
      (await service.from("fuego_admins").insert({ user_id: uid })).error,
    );
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    await page.goto("http://127.0.0.1:3000/admin");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no painel" }).click();
    const card = page.locator(".admin-poll").filter({ hasText: title });
    await card.getByRole("button", { name: "Ver votantes e e-mails" }).click();
    await card.getByText("votante-00@example.com", { exact: true }).waitFor();
    assert.equal(await card.locator("tbody tr").count(), 50);
    await card.screenshot({ path: "test-results/voter-emails.png" });
    await card.getByRole("button", { name: "Próxima", exact: true }).click();
    await card
      .getByText("Não disponível (voto antigo)", { exact: true })
      .waitFor();
    assert.equal(await card.locator("tbody tr").count(), 2);
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await card.screenshot({ path: "test-results/voter-emails-mobile.png" });
    await card.getByRole("button", { name: "Anterior", exact: true }).click();
    await card.getByText("votante-00@example.com", { exact: true }).waitFor();
  } finally {
    await browser?.close();
    if (pollId)
      assert.ifError(
        (await service.from("fuego_polls").delete().eq("id", pollId)).error,
      );
    if (uid) {
      await service.from("fuego_admins").delete().eq("user_id", uid);
      await service.from("profiles").delete().eq("id", uid);
      assert.ifError((await service.auth.admin.deleteUser(uid)).error);
    }
  }
});
