import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { randomUUID, randomBytes } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
for (const line of readFileSync(".env.local", "utf8").trim().split("\n")) {
  const i = line.indexOf("=");
  process.env[line.slice(0, i)] = line.slice(i + 1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const publicDb = createClient(url, key, { auth: { persistSession: false } });
const origin = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";
test("Fuego: permissions, admin lifecycle, voting, mobile layout", async () => {
  let uid, pollId, browser;
  const email = `fuego-qa-${randomUUID()}@example.com`,
    password = randomBytes(24).toString("hex");
  const qaTitle = `QA Fuego ${randomUUID().slice(0, 8)}`;
  try {
    const { data: created, error: ce } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.ifError(ce);
    uid = created.user.id;
    const userDb = createClient(url, key, { auth: { persistSession: false } });
    const { error: le } = await userDb.auth.signInWithPassword({
      email,
      password,
    });
    assert.ifError(le);
    const denied = await userDb
      .from("fuego_polls")
      .insert({
        title: "Unauthorized",
        week_start: "2026-10-05",
        closes_at: new Date(Date.now() + 86400000).toISOString(),
      });
    assert.ok(denied.error, "Non-admin creation denied");
    const escalate = await userDb.from("fuego_admins").insert({ user_id: uid });
    assert.ok(escalate.error, "Self-promotion denied");
    const privateVotes = await publicDb.from("fuego_votes").select("*");
    assert.ok(privateVotes.error, "Public votes unreadable");
    const rpcDenied = await publicDb.rpc("fuego_cast_vote", {
      p_poll: randomUUID(),
      p_option: randomUUID(),
      p_voter: "a".repeat(64),
      p_ip: "b".repeat(64),
    });
    assert.ok(rpcDenied.error, "Public RPC denied");
    assert.ifError(
      (await service.from("fuego_admins").insert({ user_id: uid })).error,
    );
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(origin + "/admin");
    await page.getByLabel("E-mail", { exact: true }).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Entrar no painel" }).click();
    await page.getByRole("button", { name: "Nova votação" }).click();
    await page.getByLabel("Título da votação").fill(qaTitle);
    await page.getByLabel("Semana do cardápio").fill("2026-10-05");
    await page
      .getByLabel("Encerramento da votação")
      .fill(
        new Date(Date.now() + 86400000 - 3 * 3600000)
          .toISOString()
          .slice(0, 16),
      );
    const names = ["Clássicos da casa", "Verde & cheio de sabor"];
    for (let i = 0; i < 2; i++) {
      await page.getByLabel("Nome do cardápio").nth(i).fill(names[i]);
      await page
        .locator(".option-editor")
        .nth(i)
        .locator("textarea")
        .first()
        .fill("Uma combinação de receitas para uma semana com mais sabor.");
      await page
        .locator(".option-editor")
        .nth(i)
        .locator("textarea")
        .last()
        .fill(
          i
            ? "Risoto de cogumelos\nGrão-de-bico com legumes\nNhoque ao sugo"
            : "Frango assado e legumes\nCarne de panela e purê\nArroz de forno",
        );
    }
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await page.getByText("Rascunho salvo.", { exact: false }).waitFor();
    const { data: poll, error: pe } = await service
      .from("fuego_polls")
      .select("*,fuego_options(*)")
      .eq("title", qaTitle)
      .single();
    assert.ifError(pe);
    pollId = poll.id;
    const hidden = await publicDb
      .from("fuego_polls")
      .select("*")
      .eq("id", pollId);
    assert.equal(hidden.data.length, 0, "Draft private");
    const card = page.locator(".admin-poll").filter({ hasText: qaTitle });
    await card.getByRole("button", { name: "Editar", exact: true }).click();
    await page
      .locator(".option-editor")
      .first()
      .locator("textarea")
      .first()
      .fill("Receitas com tempero de casa e personalidade.");
    await page.getByRole("button", { name: "Salvar rascunho" }).click();
    await page.getByText("Rascunho salvo.", { exact: false }).waitFor();
    await page
      .locator(".admin-poll")
      .filter({ hasText: qaTitle })
      .getByRole("button", { name: "Abrir votação" })
      .click();
    await page.getByText("Votação aberta e disponível no site.").waitFor();
    const locked = await userDb
      .from("fuego_options")
      .update({ title: "Bad edit" })
      .eq("poll_id", pollId);
    assert.ok(locked.error, "Published options immutable");
    const pollFresh = await service
      .from("fuego_options")
      .select("id")
      .eq("poll_id", pollId);
    const optionId = pollFresh.data[0].id;
    const visit = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    visit.on("pageerror", (e) => errors.push(e.message));
    await visit.goto(origin);
    await visit.getByText(qaTitle, { exact: true }).waitFor();
    mkdirSync("test-results", { recursive: true });
    await visit.screenshot({
      path: "test-results/desktop.png",
      fullPage: true,
    });
    await visit.locator(".menu-card").first().click();
    await visit
      .getByLabel("Seu e-mail para registrar o voto")
      .fill("fuego-voter-qa@example.com");
    await visit.getByRole("button", { name: "Confirmar meu voto" }).click();
    await visit.getByText("Escolha registrada.", { exact: false }).waitFor();
    const duplicate = await fetch(origin + "/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        pollId,
        optionId,
        email: " FUEGO-VOTER-QA@example.com ",
      }),
    });
    assert.equal(duplicate.status, 409, "Case-insensitive duplicate blocked");
    const crossOrigin = await fetch(origin + "/api/vote", {
      method: "POST",
      headers: { Origin: "https://example.com" },
      body: "{}",
    });
    assert.equal(crossOrigin.status, 403);
    const invalid = await fetch(origin + "/api/vote", {
      method: "POST",
      headers: { Origin: origin },
      body: JSON.stringify({ pollId, optionId, email: "invalid" }),
    });
    assert.equal(invalid.status, 400);
    await page.getByRole("button", { name: "Atualizar resultados" }).click();
    await page.getByText("1 voto · 100%").waitFor();
    await page.screenshot({ path: "test-results/admin.png", fullPage: true });
    const downloadPromise = page.waitForEvent("download");
    await page
      .locator(".admin-poll")
      .filter({ hasText: qaTitle })
      .getByRole("button", { name: "Exportar CSV" })
      .click();
    const download = await downloadPromise;
    assert.ok(download.suggestedFilename().endsWith(".csv"));
    await visit.setViewportSize({ width: 390, height: 844 });
    await visit.goto(origin);
    await visit.getByText(qaTitle, { exact: true }).waitFor();
    assert.ok(
      await visit.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      "No mobile overflow",
    );
    await visit.screenshot({ path: "test-results/mobile.png", fullPage: true });
    await visit
      .getByRole("button", { name: "Abrir menu", exact: true })
      .click();
    await visit
      .locator("nav")
      .getByRole("link", { name: "Nossa essência" })
      .click();
    assert.equal(await visit.locator("nav").isVisible(), false);
    await page
      .locator(".admin-poll")
      .filter({ hasText: qaTitle })
      .getByRole("button", { name: "Encerrar votação" })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Encerrar votação" })
      .click();
    await page
      .getByText("Votação encerrada. Os resultados estão preservados.")
      .waitFor();
    const closed = await fetch(origin + "/api/vote", {
      method: "POST",
      headers: { Origin: origin },
      body: JSON.stringify({
        pollId,
        optionId,
        email: "second-qa@example.com",
      }),
    });
    assert.equal(closed.status, 409, "Closed poll rejected");
    const reopened = await userDb
      .from("fuego_polls")
      .update({ status: "open" })
      .eq("id", pollId);
    assert.ok(reopened.error, "Closed poll cannot reopen");
    assert.equal(errors.length, 0, errors.join("\n"));
  } catch (error) {
    console.error("PRIMARY TEST ERROR", error);
    if (browser) {
      const pages = browser.contexts().flatMap((c) => c.pages());
      for (const p of pages)
        console.error((await p.locator("body").innerText()).slice(0, 3000));
    }
    throw error;
  } finally {
    await browser?.close();
    if (pollId) {
      const { error } = await service
        .from("fuego_polls")
        .delete()
        .eq("id", pollId);
      assert.ifError(error);
    }
    if (uid) {
      await service.from("profiles").delete().eq("id", uid);
      await service.from("fuego_admins").delete().eq("user_id", uid);
      assert.ifError((await service.auth.admin.deleteUser(uid)).error);
    }
  }
});
