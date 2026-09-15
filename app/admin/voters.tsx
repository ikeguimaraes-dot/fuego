"use client";
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Poll } from "@/lib/types";
import { ChevronDown, RefreshCw } from "lucide-react";
type Voter = {
  id: string;
  voter_email: string | null;
  option_id: string;
  created_at: string;
};
const pageSize = 50;
export default function Voters({
  poll,
  db,
}: {
  poll: Poll;
  db: SupabaseClient;
}) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [refresh, setRefresh] = useState(0);
  const [rows, setRows] = useState<Voter[]>([]);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setRows([]);
    async function load() {
      try {
        const { data, error, count } = await db
          .from("fuego_votes")
          .select("id,voter_email,option_id,created_at", { count: "exact" })
          .eq("poll_id", poll.id)
          .order("created_at", { ascending: false })
          .order("id")
          .range(page * pageSize, (page + 1) * pageSize - 1)
          .abortSignal(controller.signal);
        if (controller.signal.aborted) return;
        if (error) throw error;
        setRows(data || []);
        setCount(count || 0);
      } catch {
        if (!controller.signal.aborted)
          setError("Não foi possível carregar os votantes. Tente novamente.");
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }
    load();
    return () => controller.abort();
  }, [open, page, refresh, db, poll.id]);
  return (
    <section className="voters">
      <button
        className="voters-toggle"
        aria-expanded={open}
        aria-controls={`voters-${poll.id}`}
        onClick={() => setOpen(!open)}
      >
        Ver votantes e e-mails{" "}
        <ChevronDown
          size={17}
          style={{ transform: open ? "rotate(180deg)" : undefined }}
        />
      </button>
      {open && (
        <div id={`voters-${poll.id}`}>
          <div className="voters-heading">
            <p>
              E-mail, cardápio escolhido e data de cada voto. Acesso exclusivo
              da equipe.
            </p>
            <button
              className="quiet-button"
              disabled={busy}
              onClick={() => setRefresh((r) => r + 1)}
            >
              <RefreshCw size={13} /> Atualizar votantes
            </button>
          </div>
          {busy ? (
            <p role="status" className="voters-message">
              Carregando votantes…
            </p>
          ) : error ? (
            <p role="alert" className="error">
              {error}
            </p>
          ) : !rows.length ? (
            <p className="voters-message">
              Nenhum voto registrado nesta votação.
            </p>
          ) : (
            <>
              <div className="voters-scroll">
                <table className="voters-table">
                  <caption className="sr-only">
                    Votantes de {poll.title}
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">E-mail</th>
                      <th scope="col">Cardápio escolhido</th>
                      <th scope="col">Data · Brasília</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((v) => (
                      <tr key={v.id}>
                        <td>
                          {v.voter_email || (
                            <span className="legacy-email">
                              Não disponível (voto antigo)
                            </span>
                          )}
                        </td>
                        <td>
                          {poll.fuego_options.find((o) => o.id === v.option_id)
                            ?.title || "Cardápio indisponível"}
                        </td>
                        <td>
                          {new Date(v.created_at).toLocaleString("pt-BR", {
                            timeZone: "America/Sao_Paulo",
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="voters-pagination">
                <span>
                  {page * pageSize + 1}–{Math.min((page + 1) * pageSize, count)}{" "}
                  de {count} votos
                </span>
                <div>
                  <button
                    className="quiet-button"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="quiet-button"
                    disabled={(page + 1) * pageSize >= count}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
          <p className="voters-footnote">
            Votos anteriores à atualização não têm e-mail recuperável. A
            titularidade dos e-mails informados não é verificada.
          </p>
        </div>
      )}
    </section>
  );
}
