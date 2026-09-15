"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Flame,
  Heart,
  Clock3,
  Check,
  Plus,
  Minus,
  Utensils,
  X,
  Menu,
} from "lucide-react";
import type { Poll } from "@/lib/types";

export default function Home() {
  const [poll, setPoll] = useState<Poll | null>(null),
    [loading, setLoading] = useState(true),
    [loadError, setLoadError] = useState(false),
    [selected, setSelected] = useState<string | null>(null),
    [email, setEmail] = useState(""),
    [website, setWebsite] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [voted, setVoted] = useState(false),
    [nav, setNav] = useState(false),
    [privacy, setPrivacy] = useState(false);
  async function load() {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await fetch("/api/poll");
      if (!r.ok) throw Error();
      const data = await r.json();
      setPoll(data.poll);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);
  async function vote(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !poll) return;
    setBusy(true);
    setMessage("");
    try {
      const r = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pollId: poll.id,
          optionId: selected,
          email,
          website,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setVoted(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="site-header">
        <a className="wordmark" href="#" aria-label="Fuego, início">
          <img src="/brand/logo.svg" alt="Fuego — Templo do Sabor" width={612} height={304} />
        </a>
        <nav
          className={nav ? "navigation expanded" : "navigation"}
          aria-label="Navegação principal"
        >
          <a href="#essencia" onClick={() => setNav(false)}>
            Nossa essência
          </a>
          <a href="#como-funciona" onClick={() => setNav(false)}>
            Como funciona
          </a>
          <a href="#cardapio" onClick={() => setNav(false)}>
            Cardápio da semana
          </a>
        </nav>
        <a className="button nav-cta" href="#cardapio">
          Bora escolher <ArrowUpRight size={17} />
        </a>
        <button
          className="mobile-toggle"
          aria-label={nav ? "Fechar menu" : "Abrir menu"}
          aria-expanded={nav}
          onClick={() => setNav(!nav)}
        >
          {nav ? <X /> : <Menu />}
        </button>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="little-dot" /> COMIDA DE VERDADE. SEM
              COMPLICAÇÃO.
            </div>
            <h1>
              Sua rotina.
              <br />
              Mais sabor.
              <br />
              <span>Mais fuego.</span>
              <svg
                className="underline"
                viewBox="0 0 410 23"
                aria-hidden="true"
              >
                <path
                  d="M3 17Q175 -3 401 8M72 22Q213 6 362 15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </h1>
            <p>
              A gente cuida da comida.
              <br />
              Você aproveita o que a vida tem de bom.
            </p>
            <div className="hero-actions">
              <a className="button" href="#cardapio">
                Escolha o próximo cardápio <ArrowUpRight size={20} />
              </a>
              <a className="text-link" href="#essencia">
                Conheça a Fuego <ArrowRight size={17} />
              </a>
            </div>
            <div className="hero-footnote">
              <span className="mini-icon">
                <Utensils size={17} />
              </span>{" "}
              Feita com cuidado. Pensada para o seu dia.
            </div>
          </div>
          <div className="hero-visual">
            <img
              className="hero-image"
              src="/images/marmita-carne.png"
              alt="Marmita com carne de panela, batatas, arroz branco e farofa"
              fetchPriority="high"
            />
            <div className="photo-shade" />
            <span className="image-caption">SABOR QUE ACENDE O SEU DIA.</span>
            <div className="round-stamp">
              <img src="/brand/seal.svg" alt="Fuego — Templo do Sabor" />
            </div>
            <div className="photo-note">
              <span>comida de dar vontade.</span>
              <svg viewBox="0 0 75 45" aria-hidden="true">
                <path
                  d="M3 4q52 0 48 29m-12-5 12 10 16-13"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>
        </section>
        <div className="ticker" aria-hidden="true">
          COMIDA DE VERDADE <span>✳</span> MAIS TEMPO PRA VOCÊ <span>✳</span>{" "}
          SABOR SEM MESMICE <span>✳</span> SUA SEMANA, SEU CARDÁPIO{" "}
          <span>✳</span>
        </div>
        <section id="essencia" className="essence section">
          <div className="section-label">
            <span>01 / NOSSA ESSÊNCIA</span>
            <Flame size={22} />
          </div>
          <div className="essence-grid">
            <h2>
              Comida boa.
              <br />
              Sem dar
              <br />
              <em>trabalho.</em>
            </h2>
            <div className="essence-text">
              <p className="lead">
                Entre o trabalho, os compromissos e os planos de última hora,
                a vida acontece. E a sua comida merece acompanhar.
              </p>
              <p>
                A Fuego nasceu para colocar sabor na rotina. Marmitas com
                personalidade, combinações que dão vontade e aquele cuidado que
                faz diferença. Uma pausa gostosa, mesmo nos dias mais corridos.
              </p>
              <a href="#como-funciona" className="text-link">
                Menos complicação. Mais sabor. <ArrowUpRight size={18} />
              </a>
            </div>
          </div>
          <div className="values">
            <article>
              <Utensils />
              <h3>De verdade, sempre.</h3>
              <p>
                Ingredientes que você conhece. Comida que dá gosto de comer.
              </p>
            </article>
            <article>
              <Flame />
              <h3>Sabor com personalidade.</h3>
              <p>Uma boa refeição tem tempero, cor e vontade de repetir.</p>
            </article>
            <article>
              <Clock3 />
              <h3>Seu tempo de volta.</h3>
              <p>
                Praticidade para o dia a dia. Mais espaço para o que importa.
              </p>
            </article>
            <article>
              <Heart />
              <h3>Feita com você.</h3>
              <p>A sua opinião também é ingrediente do nosso cardápio.</p>
            </article>
          </div>
        </section>
        <section id="como-funciona" className="how section">
          <div className="how-image">
            <img
              src="/images/marmita-empanado.png"
              alt="Marmita com filé empanado, arroz branco, feijão e purê"
              loading="lazy"
            />
            <div className="image-label">
              BEM FEITO.
              <br />
              BEM FUEGO. <Flame />
            </div>
          </div>
          <div className="how-content">
            <div className="eyebrow">02 / SIMPLES ASSIM</div>
            <h2>
              Uma semana boa
              <br />
              começa <em>à mesa.</em>
            </h2>
            <p>Da escolha do cardápio à sua pausa favorita do dia.</p>
            <div className="steps">
              <article>
                <span>01</span>
                <div>
                  <h3>Você dá o seu toque.</h3>
                  <p>
                    Conheça as propostas da semana e vote na combinação que mais
                    combina com você.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>A gente coloca a mão na massa.</h3>
                  <p>
                    Seu voto ajuda a escolher o próximo cardápio. O cuidado com
                    o preparo fica com a Fuego.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Sua rotina ganha mais sabor.</h3>
                  <p>
                    Comida boa e prática para transformar a hora de comer em um
                    momento seu.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>
        <section id="cardapio" className="voting section">
          <div className="voting-heading">
            <div>
              <div className="eyebrow">
                03 / A PRÓXIMA SEMANA TEM O SEU TEMPERO
              </div>
              <h2>
                O que vai dar <em>fuego?</em>
              </h2>
              <p>
                Aqui, você também manda na cozinha.
                <br />
                Vote no cardápio que quer ver na próxima semana.
              </p>
            </div>
            <div className="vote-seal">
              <span>SUA VOZ</span>
              <Heart size={26} />
              <span>NO CARDÁPIO</span>
            </div>
          </div>
          {loading ? (
            <div className="empty-state" role="status">
              A cozinha está preparando as opções…
            </div>
          ) : loadError ? (
            <div className="empty-state">
              <h3>Não conseguimos carregar o cardápio.</h3>
              <p>Vamos tentar mais uma vez?</p>
              <button className="button" onClick={load}>
                Tentar novamente <ArrowRight size={18} />
              </button>
            </div>
          ) : !poll ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Utensils size={30} />
              </div>
              <span className="eyebrow">NOVIDADES SAINDO DO FORNO</span>
              <h3>A próxima escolha vem aí.</h3>
              <p>
                Estamos preparando novas combinações.
                <br />
                Volte em breve para dar seu toque no cardápio da semana.
              </p>
            </div>
          ) : (
            <>
              <div className="poll-meta">
                <span className="live-badge">
                  <span /> VOTAÇÃO ABERTA
                </span>
                <h3>{poll.title}</h3>
                <span>
                  Até{" "}
                  {new Date(poll.closes_at).toLocaleString("pt-BR", {
                    timeZone: "America/Sao_Paulo",
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · Brasília
                </span>
              </div>
              <form onSubmit={vote}>
                <fieldset disabled={voted || busy} className="menu-options">
                  <legend className="sr-only">Escolha um cardápio</legend>
                  {poll.fuego_options.map((option, i) => (
                    <label
                      key={option.id}
                      className={
                        "menu-card " +
                        (selected === option.id ? "selected" : "")
                      }
                    >
                      <input
                        type="radio"
                        name="cardapio"
                        value={option.id}
                        checked={selected === option.id}
                        onChange={() => setSelected(option.id)}
                        required
                      />
                      <div className="menu-card-top">
                        <span>OPÇÃO {String(i + 1).padStart(2, "0")}</span>
                        <span className="radio-dot">
                          {selected === option.id && <Check size={13} />}
                        </span>
                      </div>
                      <span className="menu-tag">{option.tag}</span>
                      <h3>{option.title}</h3>
                      <p>{option.description}</p>
                      <ul>
                        {option.dishes.map((dish, j) => (
                          <li key={j}>
                            <span>{String(j + 1).padStart(2, "0")}</span>
                            {dish}
                          </li>
                        ))}
                      </ul>
                      <div className="menu-select">
                        {selected === option.id
                          ? "Esse é o meu favorito"
                          : "Escolher este cardápio"}{" "}
                        <ArrowUpRight size={19} />
                      </div>
                    </label>
                  ))}
                </fieldset>
                {voted ? (
                  <div className="vote-success" role="status">
                    <Check />
                    <div>
                      <h3>Seu voto colocou mais sabor nessa semana!</h3>
                      <p>
                        Escolha registrada. Obrigado por fazer parte da Fuego.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="vote-submit">
                    <div>
                      <label htmlFor="voter-email">
                        Seu e-mail para registrar o voto
                      </label>
                      <input
                        id="voter-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="voce@exemplo.com"
                        required
                        maxLength={254}
                      />
                      <label className="honeypot" aria-hidden="true">
                        Website
                        <input
                          tabIndex={-1}
                          autoComplete="off"
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                      </label>
                      <small>
                        Um voto por e-mail em cada votação.{" "}
                        <button
                          type="button"
                          className="inline-button"
                          onClick={() => setPrivacy(true)}
                        >
                          Como usamos seus dados
                        </button>
                      </small>
                    </div>
                    <button className="button" disabled={!selected || busy}>
                      {busy ? "Registrando…" : "Confirmar meu voto"}{" "}
                      <ArrowRight size={18} />
                    </button>
                  </div>
                )}
                {message && (
                  <p className="error" role="alert">
                    {message}
                  </p>
                )}
              </form>
            </>
          )}
          <div className="vote-bottom">
            <Flame size={16} />
            <span>Uma escolha coletiva. Uma semana com mais sabor.</span>
            <span>FEITO COM VOCÊ.</span>
          </div>
        </section>
        <section className="faq section">
          <div>
            <div className="eyebrow">SEM COMPLICAÇÃO, ATÉ NAS DÚVIDAS</div>
            <h2>Pode perguntar.</h2>
          </div>
          <div>
            {[
              {
                q: "Como funciona a votação do cardápio?",
                a: "A Fuego publica propostas de cardápio. Você escolhe sua favorita e registra o voto com seu e-mail. A equipe acompanha os resultados para definir o cardápio da semana.",
              },
              {
                q: "Votar significa fazer um pedido?",
                a: "Não. A votação é uma forma de participar da escolha do cardápio. Ela não gera pedido, cobrança ou reserva de marmitas.",
              },
              {
                q: "Posso votar mais de uma vez?",
                a: "Cada e-mail pode registrar um voto por votação. Depois de confirmar, a escolha fica registrada e não pode ser alterada.",
              },
              {
                q: "Quando entram novas opções?",
                a: "As enquetes são publicadas pela equipe Fuego. Quando houver uma votação aberta, as opções e o prazo aparecerão aqui no site.",
              },
            ].map((item) => (
              <details key={item.q}>
                <summary>
                  {item.q}
                  <Plus className="plus" size={19} />
                  <Minus className="minus" size={19} />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing">
          <span>MAIS VIDA NA ROTINA. MAIS SABOR NA MESA.</span>
          <h2>Acenda a sua semana.</h2>
          <a className="button light-button" href="#cardapio">
            Vem fazer parte <ArrowUpRight size={19} />
          </a>
          <img src="/brand/flame-white.svg" className="closing-flame" alt="" aria-hidden="true" />
        </section>
      </main>
      <footer>
        <div className="footer-top">
          <a href="#" className="wordmark">
            <img src="/brand/logo.svg" alt="Fuego — Templo do Sabor" width={612} height={304} />
          </a>
          <p>
            Comida de verdade.
            <br />
            Rotina com sabor.
          </p>
          <a href="#cardapio">
            O próximo cardápio <ArrowUpRight size={16} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} Fuego. Feita para o seu dia.
          </span>
          <div>
            <button onClick={() => setPrivacy(true)}>Privacidade</button>
            <a href="/admin">
              Área da equipe <ArrowUpRight size={12} />
            </a>
          </div>
        </div>
      </footer>
      {privacy && (
        <div className="modal-backdrop" onClick={() => setPrivacy(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Fechar privacidade"
              onClick={() => setPrivacy(false)}
              autoFocus
            >
              <X />
            </button>
            <div className="eyebrow">PRIVACIDADE</div>
            <h2 id="privacy-title">Seu voto, com cuidado.</h2>
            <p>
              Usamos o e-mail informado somente para limitar a participação a um
              voto por enquete. Ele é transformado no servidor em um
              identificador criptográfico; o texto do e-mail não é salvo na
              tabela de votos.
            </p>
            <p>
              Também transformamos o endereço de rede em um identificador para
              limitar abusos. Os votos e identificadores ficam no Supabase e são
              acessíveis apenas à equipe autorizada. Não usamos seu voto para
              enviar publicidade.
            </p>
            <p>
              Esses identificadores permitem reconhecer participações repetidas,
              mas não verificam a titularidade do e-mail. A votação é consultiva
              e não representa uma compra.
            </p>
            <button className="button" onClick={() => setPrivacy(false)}>
              Entendi <Check size={16} />
            </button>
          </section>
        </div>
      )}
    </>
  );
}
