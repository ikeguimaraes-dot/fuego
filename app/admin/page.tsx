"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { browserDb } from "@/lib/supabase";
import type { Poll } from "@/lib/types";
import Voters from "./voters";
import {
  ArrowUpRight,
  Plus,
  LogOut,
  ArrowLeft,
  Download,
  RefreshCw,
  X,
  Check,
} from "lucide-react";
type Result = {
  poll_id: string;
  option_id: string;
  title: string;
  position: number;
  votes: number;
};
type OptionDraft = {
  title: string;
  description: string;
  tag: string;
  dishes: string;
};
const blank = (): OptionDraft => ({
  title: "",
  description: "",
  tag: "Cardápio da semana",
  dishes: "",
});
let client: SupabaseClient;
const db = () => client || (client = browserDb());
export default function Admin() {
  const [ready, setReady] = useState(false),
    [allowed, setAllowed] = useState(false),
    [signed, setSigned] = useState(false),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [polls, setPolls] = useState<Poll[]>([]),
    [results, setResults] = useState<Result[]>([]),
    [editing, setEditing] = useState(false),
    [editId, setEditId] = useState<string | null>(null),
    [title, setTitle] = useState(""),
    [week, setWeek] = useState(""),
    [closes, setCloses] = useState(""),
    [options, setOptions] = useState<OptionDraft[]>([blank(), blank()]),
    [confirmClose, setConfirmClose] = useState<Poll | null>(null);
  async function load() {
    const [p, r] = await Promise.all([
      db()
        .from("fuego_polls")
        .select("*,fuego_options(*)")
        .order("created_at", { ascending: false }),
      db().from("fuego_results").select("*").order("position"),
    ]);
    if (p.error || r.error) {
      setError("Não foi possível carregar o painel. Tente atualizar.");
      return;
    }
    setPolls(p.data || []);
    setResults(r.data || []);
  }
  async function checkAccess() {
    try {
      const {
        data: { user },
        error: authError,
      } = await db().auth.getUser();
      if (authError || !user) {
        setSigned(false);
        setAllowed(false);
        return;
      }
      setSigned(true);
      const { data, error } = await db()
        .from("fuego_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      setAllowed(!!data);
      if (data) await load();
    } catch {
      setError("Não foi possível verificar seu acesso. Atualize a página.");
    } finally {
      setReady(true);
    }
  }
  useEffect(() => {
    checkAccess();
    const {
      data: { subscription },
    } = db().auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setSigned(false);
        setAllowed(false);
        setPolls([]);
        setResults([]);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { error } = await db().auth.signInWithPassword({ email, password });
      if (error) {
        setError("E-mail ou senha incorretos. Confira seus dados.");
        return;
      }
      setPassword("");
      await checkAccess();
    } catch {
      setError("Não foi possível entrar. Confira sua conexão.");
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    const { error } = await db().auth.signOut();
    if (error) {
      setError("Não foi possível sair. Tente novamente.");
      return;
    }
    setAllowed(false);
    setSigned(false);
    setNotice("");
    setError("");
    setEditing(false);
  }
  function newPoll(p?: Poll) {
    setError("");
    setNotice("");
    setEditId(p?.id || null);
    setTitle(p?.title || "");
    setWeek(p?.week_start || "");
    setCloses(
      p
        ? new Date(new Date(p.closes_at).getTime() - 3 * 3600000)
            .toISOString()
            .slice(0, 16)
        : "",
    );
    setOptions(
      p
        ? [...p.fuego_options]
            .sort((a, b) => a.position - b.position)
            .map((o) => ({
              title: o.title,
              description: o.description,
              tag: o.tag,
              dishes: o.dishes.join("\n"),
            }))
        : [blank(), blank()],
    );
    setEditing(true);
  }
  function updateOption(i: number, key: keyof OptionDraft, value: string) {
    setOptions((old) =>
      old.map((o, j) => (i === j ? { ...o, [key]: value } : o)),
    );
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = options.map((o) => ({
        ...o,
        title: o.title.trim(),
        description: o.description.trim(),
        tag: o.tag.trim(),
        dishes: o.dishes
          .split("\n")
          .map((d) => d.trim())
          .filter(Boolean),
      }));
      if (
        payload.some(
          (o) =>
            o.title.length < 2 ||
            o.dishes.length < 1 ||
            o.dishes.length > 7 ||
            o.dishes.some((d) => d.length > 180),
        )
      )
        throw Error(
          "Cada opção precisa de um nome e de 1 a 7 pratos, com até 180 caracteres por prato.",
        );
      const { error } = await db().rpc("fuego_save_poll", {
        p_id: editId,
        p_title: title.trim(),
        p_week: week,
        p_closes: new Date(closes + "-03:00").toISOString(),
        p_options: payload,
      });
      if (error)
        throw Error(
          error.message.includes("invalid_closing_date")
            ? "Escolha um encerramento no futuro."
            : "Não foi possível salvar. Verifique os campos e seu acesso.",
        );
      setEditing(false);
      setNotice(
        "Rascunho salvo. Revise as opções e abra a votação quando estiver tudo pronto.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }
  async function changeStatus(p: Poll, status: "open" | "closed") {
    setBusy(true);
    setError("");
    try {
      const { data, error } = await db()
        .from("fuego_polls")
        .update({ status })
        .eq("id", p.id)
        .select("id")
        .single();
      if (error || !data)
        throw Error(
          error?.code === "23505"
            ? "Encerre a votação atual antes de abrir outra."
            : "Não foi possível alterar a votação. Verifique se o prazo é futuro e existem ao menos duas opções.",
        );
      setConfirmClose(null);
      setNotice(
        status === "open"
          ? "Votação aberta e disponível no site."
          : "Votação encerrada. Os resultados estão preservados.",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  function exportCsv(p: Poll) {
    const rows = results.filter((r) => r.poll_id === p.id);
    const safe = (s: string) =>
      '"' + (/^[=+@\-\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"';
    const csv =
      "\uFEFFCardápio;Votos\n" +
      rows.map((r) => `${safe(r.title)};${r.votes}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    a.download = `fuego-resultados-${p.week_start}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  const total = results.reduce((s, r) => s + r.votes, 0);
  return (
    <>
      <header className="admin-header">
        <a href="/" className="wordmark">
          <img
            src="/brand/logo.svg"
            alt="Fuego — Templo do Sabor"
            width={612}
            height={304}
          />
        </a>
        <div>
          <a href="/">
            Ver site <ArrowUpRight size={13} />
          </a>
          {signed && (
            <button className="quiet-button" onClick={logout}>
              <LogOut size={14} /> Sair
            </button>
          )}
        </div>
      </header>
      <main className="admin-shell">
        {!ready ? (
          <p className="admin-loading">Preparando sua cozinha…</p>
        ) : !signed ? (
          <form className="login-card" onSubmit={login}>
            <div className="eyebrow">ÁREA DA EQUIPE</div>
            <h1>Bom te ver por aqui.</h1>
            <p>
              Entre para cuidar dos cardápios e acompanhar as escolhas da
              comunidade.
            </p>
            <label className="field">
              E-mail
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="button" disabled={busy}>
              {busy ? "Entrando…" : "Entrar no painel"}{" "}
              <ArrowUpRight size={17} />
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </form>
        ) : !allowed ? (
          <div className="login-card">
            <div className="eyebrow">ACESSO RESTRITO</div>
            <h1>Conta sem acesso.</h1>
            <p>
              Esta conta está autenticada, mas ainda não faz parte da equipe
              administrativa da Fuego. Solicite a liberação ao responsável pelo
              projeto.
            </p>
            <button className="button" onClick={logout}>
              Entrar com outra conta
            </button>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="admin-heading">
              <div>
                <div className="eyebrow">FUEGO / COZINHA & COMUNIDADE</div>
                <h1>
                  {editing
                    ? "Vamos criar a próxima escolha."
                    : "O sabor da semana começa aqui."}
                </h1>
                <p>
                  {editing
                    ? "Monte de 2 a 6 propostas de cardápio para a comunidade votar."
                    : "Organize os cardápios e acompanhe o que a comunidade quer na mesa."}
                </p>
              </div>
              {!editing && (
                <button className="button" onClick={() => newPoll()}>
                  <Plus size={17} /> Nova votação
                </button>
              )}
            </div>
            {notice && (
              <p className="notice" role="status">
                {notice}
              </p>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
            {editing ? (
              <form className="editor" onSubmit={save}>
                <h2>Informações da votação</h2>
                <label className="field">
                  Título da votação
                  <input
                    required
                    minLength={3}
                    maxLength={120}
                    placeholder="Ex.: Sua escolha para a próxima semana"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </label>
                <div className="form-row">
                  <label className="field">
                    Semana do cardápio (data de início)
                    <input
                      type="date"
                      required
                      value={week}
                      onChange={(e) => setWeek(e.target.value)}
                    />
                  </label>
                  <label className="field">
                    Encerramento da votação (horário de Brasília)
                    <input
                      type="datetime-local"
                      required
                      value={closes}
                      onChange={(e) => setCloses(e.target.value)}
                    />
                  </label>
                </div>
                {options.map((o, i) => (
                  <section className="option-editor" key={i}>
                    <div>
                      <h3>OPÇÃO {String(i + 1).padStart(2, "0")}</h3>
                      {options.length > 2 && (
                        <button
                          type="button"
                          className="quiet-button"
                          onClick={() =>
                            setOptions(options.filter((_, j) => j !== i))
                          }
                        >
                          <X size={14} /> Remover opção
                        </button>
                      )}
                    </div>
                    <div className="form-row">
                      <label className="field">
                        Nome do cardápio
                        <input
                          required
                          minLength={2}
                          maxLength={80}
                          value={o.title}
                          onChange={(e) =>
                            updateOption(i, "title", e.target.value)
                          }
                          placeholder="Ex.: Clássicos com um toque Fuego"
                        />
                      </label>
                      <label className="field">
                        Etiqueta
                        <input
                          required
                          maxLength={40}
                          value={o.tag}
                          onChange={(e) =>
                            updateOption(i, "tag", e.target.value)
                          }
                          placeholder="Ex.: Comida brasileira"
                        />
                      </label>
                    </div>
                    <label className="field">
                      Descrição
                      <textarea
                        rows={2}
                        maxLength={400}
                        value={o.description}
                        onChange={(e) =>
                          updateOption(i, "description", e.target.value)
                        }
                        placeholder="Conte a ideia por trás dessa combinação"
                      />
                    </label>
                    <label className="field">
                      Pratos da proposta (um por linha, até 7)
                      <textarea
                        required
                        rows={5}
                        maxLength={1266}
                        value={o.dishes}
                        onChange={(e) =>
                          updateOption(i, "dishes", e.target.value)
                        }
                        placeholder={
                          "Frango assado, arroz e legumes\nCarne de panela com purê\nNhoque ao molho de tomate"
                        }
                      />
                    </label>
                  </section>
                ))}
                {options.length < 6 && (
                  <button
                    type="button"
                    className="quiet-button"
                    onClick={() => setOptions([...options, blank()])}
                  >
                    <Plus size={15} /> Adicionar opção
                  </button>
                )}
                <div className="editor-actions">
                  <button
                    type="button"
                    className="quiet-button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(false);
                      setError("");
                    }}
                  >
                    <ArrowLeft size={15} /> Voltar ao painel
                  </button>
                  <button className="button" disabled={busy}>
                    {busy ? "Salvando…" : "Salvar rascunho"} <Check size={17} />
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span>Votações criadas</span>
                    <strong>{polls.length}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Participações</span>
                    <strong>{total}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Votação em andamento</span>
                    <strong>
                      {polls.some(
                        (p) =>
                          p.status === "open" &&
                          new Date(p.closes_at) > new Date(),
                      )
                        ? "Aberta"
                        : "Nenhuma"}
                    </strong>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginBottom: 16,
                  }}
                >
                  <button
                    className="quiet-button"
                    onClick={async () => {
                      setError("");
                      await load();
                    }}
                  >
                    <RefreshCw size={13} /> Atualizar resultados
                  </button>
                </div>
                {!polls.length ? (
                  <div className="admin-empty">
                    <h3>Sua primeira votação começa aqui.</h3>
                    <p>
                      Crie uma enquete, adicione as propostas de cardápio e
                      publique para receber os primeiros votos.
                    </p>
                  </div>
                ) : (
                  <div className="poll-list">
                    {polls.map((p) => {
                      const rows = results.filter((r) => r.poll_id === p.id);
                      const count = rows.reduce((s, r) => s + r.votes, 0);
                      const expired = new Date(p.closes_at) <= new Date();
                      return (
                        <article className="admin-poll" key={p.id}>
                          <div className="admin-poll-top">
                            <div>
                              <span className={"status-pill " + p.status}>
                                {p.status === "draft"
                                  ? "Rascunho"
                                  : p.status === "closed"
                                    ? "Encerrada"
                                    : expired
                                      ? "Prazo encerrado"
                                      : "Votação aberta"}
                              </span>
                              <h3>{p.title}</h3>
                              <p>
                                Semana de{" "}
                                {new Date(
                                  p.week_start + "T12:00:00",
                                ).toLocaleDateString("pt-BR")}{" "}
                                · Encerra{" "}
                                {new Date(p.closes_at).toLocaleString("pt-BR", {
                                  timeZone: "America/Sao_Paulo",
                                  day: "2-digit",
                                  month: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}{" "}
                                (Brasília)
                              </p>
                            </div>
                            <div className="admin-poll-actions">
                              {p.status === "draft" && (
                                <>
                                  <button
                                    className="quiet-button"
                                    disabled={busy}
                                    onClick={() => newPoll(p)}
                                  >
                                    Editar
                                  </button>
                                  <button
                                    className="button small-button"
                                    disabled={busy}
                                    onClick={() => changeStatus(p, "open")}
                                  >
                                    Abrir votação <ArrowUpRight size={14} />
                                  </button>
                                </>
                              )}
                              {p.status === "open" && (
                                <button
                                  className="quiet-button"
                                  disabled={busy}
                                  onClick={() => setConfirmClose(p)}
                                >
                                  Encerrar votação
                                </button>
                              )}
                            </div>
                          </div>
                          <div className="results">
                            {rows.map((r) => (
                              <div className="result-row" key={r.option_id}>
                                <div className="result-caption">
                                  <span>{r.title}</span>
                                  <strong>
                                    {r.votes} {r.votes === 1 ? "voto" : "votos"}{" "}
                                    ·{" "}
                                    {count
                                      ? Math.round((r.votes / count) * 100)
                                      : 0}
                                    %
                                  </strong>
                                </div>
                                <div className="result-track">
                                  <span
                                    style={{
                                      width: `${count ? (r.votes / count) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                {p.status === "draft" && (
                                  <p style={{ fontSize: 11, marginTop: 8 }}>
                                    {p.fuego_options
                                      .find((o) => o.id === r.option_id)
                                      ?.dishes.join(" · ")}
                                  </p>
                                )}
                              </div>
                            ))}
                            <Voters poll={p} db={db()} />
                            <div className="results-total">
                              <span>
                                {count}{" "}
                                {count === 1 ? "participação" : "participações"}{" "}
                                no total
                              </span>
                              <button
                                className="quiet-button"
                                onClick={() => exportCsv(p)}
                              >
                                <Download size={13} /> Exportar CSV
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
      {confirmClose && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-title"
          >
            <h2 id="close-title">Encerrar esta votação?</h2>
            <p>
              “{confirmClose.title}” deixará de receber votos. Os resultados
              serão mantidos e esta enquete não poderá ser reaberta.
            </p>
            <div className="editor-actions">
              <button
                className="quiet-button"
                disabled={busy}
                onClick={() => setConfirmClose(null)}
              >
                Voltar
              </button>
              <button
                className="button"
                disabled={busy}
                onClick={() => changeStatus(confirmClose, "closed")}
              >
                {busy ? "Encerrando…" : "Encerrar votação"}
              </button>
            </div>
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
