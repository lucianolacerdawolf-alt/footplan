import { Fragment, memo, useMemo, useState } from 'react';
import type { Team } from '../engine/types';
import type { LeagueState, Standing, LeagueFixture } from '../engine/tournament';
import type { LeagueDefinition } from '../data/leagues/types';
import { computeStandings } from '../engine/tournament';
import TopScorersTable from './TopScorersTable';
import styles from './LeagueTableScreen.module.css';
import { crestSrc } from '../utils/crest';
import { ScreenHeader } from './ui';
import PositionChart from './PositionChart';

function getRecentForm(teamId: string, fixtures: LeagueFixture[][]): ('W' | 'D' | 'L')[] {
  const results: ('W' | 'D' | 'L')[] = [];
  for (let r = fixtures.length - 1; r >= 0 && results.length < 5; r--) {
    const round = fixtures[r];
    for (const f of round) {
      if (!f.played || f.homeScore == null || f.awayScore == null) continue;
      if (f.homeTeamId === teamId) {
        results.unshift(f.homeScore > f.awayScore ? 'W' : f.homeScore === f.awayScore ? 'D' : 'L');
        break;
      }
      if (f.awayTeamId === teamId) {
        results.unshift(f.awayScore > f.homeScore ? 'W' : f.awayScore === f.homeScore ? 'D' : 'L');
        break;
      }
    }
  }
  return results;
}

function teamById(teams: Team[], id: string): Team {
  return teams.find(t => t.id === id)!;
}

function getZoneColor(pos: number, league: LeagueDefinition): string {
  const clEnd = league.europeanSlots.championsLeague;
  const elEnd = clEnd + league.europeanSlots.europaLeague;
  const ecolEnd = elEnd + league.europeanSlots.conferenceLeague;
  const relStart = league.teams.length - league.relegationSpots + 1;
  if (pos <= clEnd) return '#1d9bf0';
  if (pos <= elEnd) return '#e85d04';
  if (pos <= ecolEnd) return '#38a169';
  if (pos >= relStart) return '#e53e3e';
  return 'transparent';
}

interface TeamDetail {
  home: [number, number, number];
  away: [number, number, number];
  next: { opponentId: string; atHome: boolean; round: number } | null;
}

function teamDetail(teamId: string, fixtures: LeagueFixture[][]): TeamDetail {
  const home: [number, number, number] = [0, 0, 0];
  const away: [number, number, number] = [0, 0, 0];
  let next: TeamDetail['next'] = null;
  fixtures.forEach((round, r) => {
    for (const f of round) {
      const isHome = f.homeTeamId === teamId;
      if (!isHome && f.awayTeamId !== teamId) continue;
      if (!f.played || f.homeScore == null || f.awayScore == null) {
        if (!next) next = { opponentId: isHome ? f.awayTeamId : f.homeTeamId, atHome: isHome, round: r + 1 };
        continue;
      }
      const mine = isHome ? f.homeScore : f.awayScore;
      const theirs = isHome ? f.awayScore : f.homeScore;
      const rec = isHome ? home : away;
      rec[mine > theirs ? 0 : mine === theirs ? 1 : 2]++;
    }
  });
  return { home, away, next };
}

/** Posição de cada time antes da última rodada jogada — pra seta de subiu/desceu. */
function previousPositions(teams: Team[], fixtures: LeagueFixture[][]): Map<string, number> | null {
  let last = -1;
  fixtures.forEach((round, r) => { if (round.some(f => f.played)) last = r; });
  if (last <= 0) return null;
  const before = computeStandings(teams, fixtures.slice(0, last));
  return new Map(before.map((s, i) => [s.teamId, i + 1]));
}

type Split = 'all' | 'home' | 'away';

/** Tabela só com os jogos em casa (ou só fora) de cada time. */
function splitStandings(teams: Team[], fixtures: LeagueFixture[][], split: Exclude<Split, 'all'>): Standing[] {
  const map = new Map<string, Standing>(teams.map(t => [t.id, { teamId: t.id, points: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 }]));
  for (const round of fixtures) for (const f of round) {
    if (!f.played || f.homeScore == null || f.awayScore == null) continue;
    const id = split === 'home' ? f.homeTeamId : f.awayTeamId;
    const gf = split === 'home' ? f.homeScore : f.awayScore;
    const ga = split === 'home' ? f.awayScore : f.homeScore;
    const s = map.get(id);
    if (!s) continue;
    s.played++; s.goalsFor += gf; s.goalsAgainst += ga;
    if (gf > ga) { s.won++; s.points += 3; } else if (gf === ga) { s.drawn++; s.points++; } else s.lost++;
  }
  return [...map.values()].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
}

const rec = (r: [number, number, number]) => `${r[0]}V ${r[1]}E ${r[2]}D`;

function FormDots({ form }: { form: ('W' | 'D' | 'L')[] }) {
  return (
    <>
      {form.map((r, idx) => (
        <span key={idx} className={`${styles.formDot} ${r === 'W' ? styles.formWin : r === 'D' ? styles.formDraw : styles.formLoss}`}>
          {r === 'W' ? 'V' : r === 'D' ? 'E' : 'D'}
        </span>
      ))}
    </>
  );
}

export function StandingsTable({ standings, teams, userTeamId, league, fixtures, plain }: { standings: Standing[]; teams: Team[]; userTeamId: string; league: LeagueDefinition; fixtures?: LeagueFixture[][]; /** Recorte casa/fora: sem zonas nem setas. */ plain?: boolean }) {
  const showForm = !!fixtures;
  const [openId, setOpenId] = useState<string | null>(null);
  const prev = useMemo(() => (fixtures && !plain ? previousPositions(teams, fixtures) : null), [teams, fixtures, plain]);
  const cols = showForm ? 13 : 12;
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.thZone} />
          <th className={styles.thPos}>#</th>
          <th className={styles.thTeam}>Clube</th>
          <th className={styles.thPts}>Pts</th>
          <th>J</th><th>V</th><th>E</th><th>D</th>
          <th className={styles.colExtra}>GP</th><th className={styles.colExtra}>GC</th><th className={styles.thSg}>SG</th>
          <th className={styles.colExtra} title="Aproveitamento dos pontos disputados">%</th>
          {showForm && <th className={`${styles.thForm} ${styles.colExtra}`}>Forma</th>}
        </tr>
      </thead>
      <tbody>
        {standings.map((s, i) => {
          const pos = i + 1;
          const team = teamById(teams, s.teamId);
          const isUser = s.teamId === userTeamId;
          const sg = s.goalsFor - s.goalsAgainst;
          const form = fixtures ? getRecentForm(s.teamId, fixtures) : null;
          const pct = s.played > 0 ? Math.round((s.points / (s.played * 3)) * 100) : 0;
          const before = prev?.get(s.teamId);
          const move = before ? before - pos : 0;
          const open = openId === s.teamId;
          const detail = open && fixtures ? teamDetail(s.teamId, fixtures) : null;
          const nextOpp = detail?.next ? teams.find(t => t.id === detail.next!.opponentId) : null;
          return (
            <Fragment key={s.teamId}>
            <tr
              className={`${styles.row} ${isUser ? styles.rowUser : ''} ${fixtures ? styles.rowClickable : ''} ${open ? styles.rowOpen : ''}`}
              onClick={fixtures ? () => setOpenId(open ? null : s.teamId) : undefined}
              aria-expanded={fixtures ? open : undefined}
            >
              <td className={styles.tdZone} style={{ background: plain ? 'transparent' : getZoneColor(pos, league) }} />
              <td className={styles.tdPos}>
                {pos}
                {move !== 0 && <span className={move > 0 ? styles.moveUp : styles.moveDown} title={move > 0 ? `Subiu ${move}` : `Caiu ${-move}`}>{move > 0 ? '▲' : '▼'}</span>}
              </td>
              <td className={styles.tdTeam}>
                <img src={crestSrc(team.logoUrl)} alt={team.abbreviation} className={styles.tableCrest} />
                <span className={styles.teamName}>{team.name}</span>
                <span className={styles.teamAbbr}>{team.abbreviation}</span>
              </td>
              <td className={styles.tdPts}>{s.points}</td>
              <td>{s.played}</td>
              <td>{s.won}</td>
              <td>{s.drawn}</td>
              <td>{s.lost}</td>
              <td className={styles.colExtra}>{s.goalsFor}</td>
              <td className={styles.colExtra}>{s.goalsAgainst}</td>
              <td className={sg >= 0 ? styles.sgPos : styles.sgNeg}>{sg > 0 ? '+' : ''}{sg}</td>
              <td className={styles.colExtra}>{pct}</td>
              {showForm && form && (
                <td className={`${styles.tdForm} ${styles.colExtra}`}>
                  <FormDots form={form} />
                </td>
              )}
            </tr>
            {detail && (
              <tr className={styles.detailRow}>
                <td colSpan={cols}>
                  <div className={styles.detailGrid}>
                    <div><span>Gols</span><b>{s.goalsFor} pró · {s.goalsAgainst} contra</b></div>
                    <div><span>Aproveitamento</span><b>{pct}%</b></div>
                    <div><span>Em casa</span><b>{rec(detail.home)}</b></div>
                    <div><span>Fora</span><b>{rec(detail.away)}</b></div>
                    <div className={styles.detailWide}>
                      <span>Últimos 5</span>
                      <b className={styles.detailForm}>{form && form.length > 0 ? <FormDots form={form} /> : '—'}</b>
                    </div>
                    <div className={styles.detailWide}>
                      <span>Próximo jogo</span>
                      <b>{nextOpp && detail.next
                        ? <>Rodada {detail.next.round} · {detail.next.atHome ? 'em casa' : 'fora'} vs <img src={crestSrc(nextOpp.logoUrl)} alt="" className={styles.detailCrest} /> {nextOpp.name}</>
                        : 'Temporada encerrada'}</b>
                    </div>
                  </div>
                </td>
              </tr>
            )}
            </Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

interface Props {
  state: LeagueState;
  league: LeagueDefinition;
  onBack: () => void;
  /** Mantido por compatibilidade: a Classificação é subtela e sempre mostra o Voltar. */
  hideTopNav?: boolean;
}

function LeagueTableScreen({ state, league, onBack }: Props) {
  const { teams, userTeamId, fixtures } = state;
  const standings: Standing[] = computeStandings(teams, fixtures);
  const [view, setView] = useState<'table' | 'scorers' | 'chart'>('table');
  const [split, setSplit] = useState<Split>('all');
  const shown = useMemo(() => (split === 'all' ? standings : splitStandings(teams, fixtures, split)), [split, standings, teams, fixtures]);
  const scorers = useMemo(() => {
    const map = new Map<string, { name: string; goals: number; team: string }>();
    for (const round of fixtures) {
      for (const f of round) {
        if (!f.scorers) continue;
        for (const s of f.scorers) {
          const existing = map.get(s.playerName);
          if (existing) { existing.goals += s.goals; }
          else {
            const team = teams.find(t => t.id === s.teamId);
            map.set(s.playerName, { name: s.playerName, goals: s.goals, team: team?.abbreviation ?? '???' });
          }
        }
      }
    }
    return [...map.values()].sort((a, b) => b.goals - a.goals).slice(0, 15);
  }, [fixtures, teams]);

  return (
    <div className={`${styles.screen} app-screen fit-screen`}>
      <ScreenHeader onBack={onBack} kicker={league.name} title="Classificação" />

      <div className={styles.viewTabs} role="tablist">
        <button role="tab" aria-selected={view === 'table'} className={`${styles.viewTab} ${view === 'table' ? styles.viewTabOn : ''}`} onClick={() => setView('table')}>Tabela</button>
        <button role="tab" aria-selected={view === 'scorers'} className={`${styles.viewTab} ${view === 'scorers' ? styles.viewTabOn : ''}`} onClick={() => setView('scorers')}>Artilheiros</button>
        <button role="tab" aria-selected={view === 'chart'} className={`${styles.viewTab} ${view === 'chart' ? styles.viewTabOn : ''}`} onClick={() => setView('chart')}>Campanha</button>
      </div>

      {view === 'table' ? (
        <>
          <div className={styles.splitRow} role="group" aria-label="Recorte da tabela">
            {([['all', 'Geral'], ['home', 'Casa'], ['away', 'Fora']] as const).map(([k, l]) => (
              <button key={k} className={`${styles.splitBtn} ${split === k ? styles.splitOn : ''}`} aria-pressed={split === k} onClick={() => setSplit(k)}>{l}</button>
            ))}
          </div>
          <div className={`${styles.standingsScroll} fit-scroll`}>
            <StandingsTable standings={shown} teams={teams} userTeamId={userTeamId} league={league} fixtures={fixtures} plain={split !== 'all'} />
          </div>
          <div className={styles.zoneLegend}>
            <span className={styles.zoneDot} style={{ background: '#1d9bf0' }} />Champions
            <span className={styles.zoneDot} style={{ background: '#e85d04' }} />Europa
            <span className={styles.zoneDot} style={{ background: '#38a169' }} />Conference
            <span className={styles.zoneDot} style={{ background: '#e53e3e' }} />Rebaixamento
          </div>
          <div className={styles.tableHint}>Toque num time para ver casa/fora, últimos jogos e o próximo adversário. ▲▼ = mudança desde a rodada anterior.</div>
        </>
      ) : view === 'chart' ? (
        <div className="fit-scroll">
          <PositionChart teams={teams} fixtures={fixtures} teamId={userTeamId} />
        </div>
      ) : (
        <div className="fit-scroll">
          <TopScorersTable scorers={scorers} />
        </div>
      )}
    </div>
  );
}

export default memo(LeagueTableScreen);
