import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Team } from '../engine/types';
import { allLeagues, getLeague } from '../data/leagues';
import { getLoadedLeagueTeams } from '../services/rosterSync';
import { hasRosterCloud } from '../services/rosterCloud';
import {
  createFriendLeague, findFriendLeagueByCode, joinFriendLeague, listMyFriendLeagues,
  loadFriendLeague, saveFriendStrategy, settleDueRounds, type FriendLeague, type FriendLeagueData,
} from '../services/friendLeagueService';
import { friendSchedule, friendStandings, dueRoundCount, utcToday, msToNextRound } from '../engine/friendLeague';
import { TACTIC_PRESETS } from '../engine/tacticPresets';
import { markInFriendLeague, syncReminders } from '../services/reminders';
import { getAvgOvr } from '../utils/teamUtils';
import { crestSrc } from '../utils/crest';
import { Button } from './ui';
import styles from './FriendLeagueScreen.module.css';
import { ScreenHeader } from './ui';

interface Props { onBack: () => void }

type View =
  | { kind: 'list' }
  | { kind: 'create' }
  | { kind: 'join'; league?: FriendLeague }
  | { kind: 'league'; leagueId: string };

function teamsFor(leagueId: string): Team[] {
  return getLoadedLeagueTeams(leagueId) ?? getLeague(leagueId)?.teams ?? [];
}

function fmtCountdown(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h}h ${String(m).padStart(2, '0')}min`;
}

function TeamPicker({ teams, taken, selected, onSelect }: { teams: Team[]; taken: Set<string>; selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className={styles.teamGrid}>
      {[...teams].sort((a, b) => a.name.localeCompare(b.name)).map(t => {
        const isTaken = taken.has(t.id);
        return (
          <button key={t.id} className={`${styles.teamBtn} ${selected === t.id ? styles.teamSelected : ''}`}
            onClick={() => !isTaken && onSelect(t.id)} disabled={isTaken}
            aria-pressed={selected === t.id} aria-label={`${t.name}, força ${getAvgOvr(t)}${isTaken ? ', já tem dono' : ''}`}>
            <img src={crestSrc(t.logoUrl)} alt="" className={styles.crest} />
            <span className={styles.teamName}>{t.name}</span>
            <span className={styles.teamOvr}>{isTaken ? '👤' : getAvgOvr(t)}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function FriendLeagueScreen({ onBack }: Props) {
  const [view, setView] = useState<View>({ kind: 'list' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [myLeagues, setMyLeagues] = useState<FriendLeague[] | null>(null);
  const [managerName, setManagerName] = useState(() => { try { return localStorage.getItem('fp:friendManager') ?? ''; } catch { return ''; } });

  // criar
  const [newName, setNewName] = useState('Liga dos Amigos');
  const [baseLeagueId, setBaseLeagueId] = useState('pl');
  const [pickedTeam, setPickedTeam] = useState<string | null>(null);
  // entrar
  const [code, setCode] = useState('');
  // liga aberta
  const [data, setData] = useState<FriendLeagueData | null>(null);
  const [copied, setCopied] = useState(false);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : 'Algo deu errado.'); }
    finally { setBusy(false); }
  }, []);

  const rememberName = (n: string) => { setManagerName(n); try { localStorage.setItem('fp:friendManager', n); } catch { /* noop */ } };

  useEffect(() => {
    if (view.kind !== 'list') return;
    void run(async () => {
      const leagues = await listMyFriendLeagues();
      setMyLeagues(leagues);
      // Lembrete de rodada nova (app Android) só pra quem está em alguma liga.
      if (markInFriendLeague(leagues.length > 0)) void syncReminders();
    });
  }, [view.kind, run]);

  const openLeague = useCallback((leagueId: string) => {
    setView({ kind: 'league', leagueId });
    void run(async () => {
      let d = await loadFriendLeague(leagueId);
      if (await settleDueRounds(d)) d = await loadFriendLeague(leagueId);
      setData(d);
    });
  }, [run]);

  if (!hasRosterCloud()) {
    return (
      <div className={`${styles.screen} app-screen`}>
        <ScreenHeader onBack={onBack} title="Liga entre Amigos" />
        <p className={styles.note}>A Liga entre Amigos precisa de conexão com a nuvem, que não está configurada nesta versão.</p>
      </div>
    );
  }

  const header = (title: string, back: () => void) => (
    <ScreenHeader onBack={back} title={title} />
  );
  const errorBox = error && <p className={styles.error} role="alert">{error}</p>;
  const nameField = (
    <label className={styles.field}>
      <span>Seu nome de técnico</span>
      <input value={managerName} maxLength={24} onChange={e => rememberName(e.target.value)} placeholder="Seu nome" />
    </label>
  );

  // ── Lista ────────────────────────────────────────────────────────────────
  if (view.kind === 'list') {
    return (
      <div className={`${styles.screen} app-screen`}>
        {header('👥 Liga entre Amigos', onBack)}
        <p className={styles.note}>Cada um comanda um clube da mesma liga. Uma rodada por dia, à meia-noite (UTC) — ninguém precisa estar online junto.</p>
        <div className={styles.actions}>
          <Button onClick={() => { setPickedTeam(null); setView({ kind: 'create' }); }}>Criar liga</Button>
          <Button variant="secondary" onClick={() => setView({ kind: 'join' })}>Entrar com código</Button>
        </div>
        {errorBox}
        <h2 className={styles.subtitle}>Minhas ligas</h2>
        {myLeagues === null && <p className={styles.note}>Carregando…</p>}
        {myLeagues?.length === 0 && <p className={styles.note}>Você ainda não está em nenhuma liga.</p>}
        <ul className={styles.list}>
          {myLeagues?.map(l => (
            <li key={l.id}>
              <button className={styles.leagueRow} onClick={() => openLeague(l.id)}>
                <span className={styles.leagueName}>{l.name}</span>
                <span className={styles.leagueMeta}>{getLeague(l.baseLeagueId)?.name ?? l.baseLeagueId} · código {l.code}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // ── Criar ────────────────────────────────────────────────────────────────
  if (view.kind === 'create') {
    const teams = teamsFor(baseLeagueId);
    return (
      <div className={`${styles.screen} app-screen`}>
        {header('Criar liga', () => setView({ kind: 'list' }))}
        <label className={styles.field}>
          <span>Nome da liga</span>
          <input value={newName} maxLength={40} onChange={e => setNewName(e.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Campeonato base</span>
          <select value={baseLeagueId} onChange={e => { setBaseLeagueId(e.target.value); setPickedTeam(null); }}>
            {allLeagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </label>
        {nameField}
        <h2 className={styles.subtitle}>Escolha seu clube</h2>
        <TeamPicker teams={teams} taken={new Set()} selected={pickedTeam} onSelect={setPickedTeam} />
        {errorBox}
        <div className={styles.stickyAction}>
          <Button block disabled={busy || !pickedTeam || !managerName.trim() || !newName.trim()}
            onClick={() => run(async () => {
              const lg = await createFriendLeague(newName, baseLeagueId, teams, pickedTeam!, managerName);
              openLeague(lg.id);
            })}>
            {busy ? 'Criando…' : 'Criar e entrar'}
          </Button>
        </div>
      </div>
    );
  }

  // ── Entrar ───────────────────────────────────────────────────────────────
  if (view.kind === 'join') {
    const found = view.league;
    return (
      <div className={`${styles.screen} app-screen`}>
        {header('Entrar com código', () => setView({ kind: 'list' }))}
        {!found && (
          <>
            <label className={styles.field}>
              <span>Código da liga (6 letras)</span>
              <input value={code} maxLength={6} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Ex.: K7PQ2M" />
            </label>
            {errorBox}
            <Button disabled={busy || code.trim().length !== 6} onClick={() => run(async () => {
              const lg = await findFriendLeagueByCode(code);
              if (!lg) throw new Error('Nenhuma liga com esse código.');
              const d = await loadFriendLeague(lg.id);
              if (d.members.some(m => m.userId === d.myUserId)) { openLeague(lg.id); return; }
              setData(d);
              setPickedTeam(null);
              setView({ kind: 'join', league: lg });
            })}>{busy ? 'Buscando…' : 'Buscar'}</Button>
          </>
        )}
        {found && data && (
          <>
            <p className={styles.note}><strong>{found.name}</strong> · {data.members.length} técnico{data.members.length !== 1 ? 's' : ''}</p>
            {nameField}
            <h2 className={styles.subtitle}>Escolha um clube livre</h2>
            <TeamPicker teams={found.teams} taken={new Set(data.members.map(m => m.teamId))} selected={pickedTeam} onSelect={setPickedTeam} />
            {errorBox}
            <div className={styles.stickyAction}>
              <Button block disabled={busy || !pickedTeam || !managerName.trim()} onClick={() => run(async () => {
                await joinFriendLeague(found.id, pickedTeam!, managerName);
                openLeague(found.id);
              })}>{busy ? 'Entrando…' : 'Entrar na liga'}</Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Liga aberta ──────────────────────────────────────────────────────────
  return <FriendLeagueView data={data} busy={busy} error={error} copied={copied}
    onBack={() => { setData(null); setView({ kind: 'list' }); }}
    onCopy={async () => { if (!data) return; try { await navigator.clipboard.writeText(data.league.code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* noop */ } }}
    onPreset={(presetId) => run(async () => {
      if (!data) return;
      const me = data.members.find(m => m.userId === data.myUserId);
      const team = data.league.teams.find(t => t.id === me?.teamId);
      const preset = TACTIC_PRESETS.find(p => p.id === presetId);
      if (!me || !team || !preset) return;
      const strategy = { ...(me.strategy ?? team.strategy), mentality: preset.mentality, intensity: preset.intensity, defensiveLine: preset.defensiveLine, width: preset.width };
      await saveFriendStrategy(data.league.id, strategy);
      setData({ ...data, members: data.members.map(m => m.userId === me.userId ? { ...m, strategy } : m) });
    })}
  />;
}

function FriendLeagueView({ data, busy, error, copied, onBack, onCopy, onPreset }: {
  data: FriendLeagueData | null; busy: boolean; error: string | null; copied: boolean;
  onBack: () => void; onCopy: () => void; onPreset: (id: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);

  const computed = useMemo(() => {
    if (!data) return null;
    const schedule = friendSchedule(data.league.teams);
    const { fixtures, standings } = friendStandings(data.league.teams, schedule, data.rounds);
    const due = dueRoundCount(data.league.startDate, utcToday(new Date(now)), schedule.length);
    return { schedule, fixtures, standings, due };
  }, [data, now]);

  if (!data || !computed) {
    return (
      <div className={`${styles.screen} app-screen`}>
        <ScreenHeader onBack={onBack} title="Liga entre Amigos" />
        {error ? <p className={styles.error} role="alert">{error}</p> : <p className={styles.note}>Carregando a liga…</p>}
      </div>
    );
  }

  const { league, members, myUserId } = data;
  const me = members.find(m => m.userId === myUserId);
  const teamById = new Map(league.teams.map(t => [t.id, t]));
  const ownerByTeam = new Map(members.map(m => [m.teamId, m.managerName]));
  const nextRound = computed.due;
  const finished = nextRound >= computed.schedule.length;
  const myNext = !finished && me ? computed.schedule[nextRound].find(f => f.homeTeamId === me.teamId || f.awayTeamId === me.teamId) : undefined;
  const lastRound = nextRound - 1;
  const lastResults = lastRound >= 0 ? (data.rounds.get(lastRound) ?? []) : [];
  const myStrategy = me?.strategy ?? (me ? teamById.get(me.teamId)?.strategy : undefined);
  const activePreset = TACTIC_PRESETS.find(p => p.mentality === myStrategy?.mentality && p.intensity === myStrategy?.intensity)?.id;
  const abbr = (id: string) => teamById.get(id)?.abbreviation ?? '???';

  return (
    <div className={`${styles.screen} app-screen`}>
      <ScreenHeader onBack={onBack} kicker="Liga entre Amigos" title={league.name} />
      <div className={styles.codeRow}>
        <span>Código pra convidar: <strong className={styles.code}>{league.code}</strong></span>
        <Button size="sm" variant="secondary" onClick={onCopy}>{copied ? 'Copiado!' : 'Copiar'}</Button>
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}

      <section className={styles.panel}>
        {finished ? (
          <p className={styles.note}>🏁 Temporada encerrada!</p>
        ) : (
          <>
            <p className={styles.note}>Rodada {nextRound + 1} de {computed.schedule.length} · acontece em <strong>{fmtCountdown(msToNextRound(new Date(now)))}</strong></p>
            {myNext && (
              <p className={styles.nextMatch}>
                Seu jogo: <strong>{teamById.get(myNext.homeTeamId)?.name}</strong> × <strong>{teamById.get(myNext.awayTeamId)?.name}</strong>
              </p>
            )}
          </>
        )}
        {me && !finished && (
          <div className={styles.presets} role="group" aria-label="Tática para a próxima rodada">
            {TACTIC_PRESETS.map(p => (
              <button key={p.id} className={`${styles.preset} ${activePreset === p.id ? styles.presetActive : ''}`}
                onClick={() => onPreset(p.id)} disabled={busy} aria-pressed={activePreset === p.id}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {lastResults.length > 0 && (
        <section className={styles.panel}>
          <h2 className={styles.subtitle}>Rodada {lastRound + 1}</h2>
          <ul className={styles.results}>
            {lastResults.map(r => (
              <li key={r.fixtureId}>{abbr(r.homeTeamId)} <strong>{r.homeScore}–{r.awayScore}</strong> {abbr(r.awayTeamId)}</li>
            ))}
          </ul>
        </section>
      )}

      <section className={styles.panel}>
        <h2 className={styles.subtitle}>Classificação</h2>
        <table className={styles.table}>
          <thead><tr><th>#</th><th>Clube</th><th>J</th><th>SG</th><th>Pts</th></tr></thead>
          <tbody>
            {computed.standings.map((s, i) => {
              const owner = ownerByTeam.get(s.teamId);
              return (
                <tr key={s.teamId} className={me?.teamId === s.teamId ? styles.mine : owner ? styles.human : undefined}>
                  <td>{i + 1}</td>
                  <td>{teamById.get(s.teamId)?.name ?? s.teamId}{owner && <span className={styles.owner}> · {owner}</span>}</td>
                  <td>{s.played}</td>
                  <td>{s.goalsFor - s.goalsAgainst}</td>
                  <td><strong>{s.points}</strong></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
