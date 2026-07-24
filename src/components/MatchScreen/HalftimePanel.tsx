import React from 'react';
import type { Team, Strategy, MatchEvent } from '@/engine/types';
import type { SubWindow } from '@/utils/liveMatchPersistence';
import { playerOvr } from '@/utils/playerOvr';
import TacticPresets from '../shared/TacticPresets';
import TacticEditor from '../shared/TacticEditor';

const SUB_WINDOW_LABELS: Record<SubWindow, string> = { firstHalfPause: '1\u00BAT', halftime: 'Intervalo', secondHalfPause: '2\u00BAT' };
function formatSubWindows(w: Record<SubWindow, number>): string {
  return (['firstHalfPause', 'halftime', 'secondHalfPause'] as SubWindow[])
    .map(k => `${SUB_WINDOW_LABELS[k]} ${w[k]}`).join(' \u00B7 ');
}

interface OnlineInfo {
  isHost: boolean;
}

interface Props {
  home: Team;
  away: Team;
  setHome: React.Dispatch<React.SetStateAction<Team>>;
  setAway: React.Dispatch<React.SetStateAction<Team>>;
  updateHome: (s: Strategy) => void;
  updateAway: (s: Strategy) => void;
  replayEvents: MatchEvent[];
  initialHome: Team;
  initialAway: Team;
  online?: OnlineInfo;
  hostReady: boolean;
  guestReady: boolean;
  sendReadyHalftime: () => void;
  subsHome: number;
  subsAway: number;
  subWindowsHome: Record<SubWindow, number>;
  subWindowsAway: Record<SubWindow, number>;
  htHomePick: string | null;
  htAwayPick: string | null;
  setHtHomePick: React.Dispatch<React.SetStateAction<string | null>>;
  setHtAwayPick: React.Dispatch<React.SetStateAction<string | null>>;
  swapSquad: (team: Team, setTeam: (t: Team) => void, benchIdx: number, starterIdx: number, side: 'home' | 'away') => void;
  fatigueMap?: Record<string, number>;
  MAX_SUBS: number;
  runSecondHalf: (home: Team, away: Team) => void;
  subToast: string | null;
  matchContext?: 'regular' | 'league' | 'bracket' | 'online';
  userSide?: 'home' | 'away';
}

export default function HalftimePanel({
  home, away, setHome, setAway, updateHome, updateAway,
  replayEvents, initialHome, initialAway, online, hostReady, guestReady,
  sendReadyHalftime, subsHome, subsAway, subWindowsHome, subWindowsAway,
  htHomePick, htAwayPick, setHtHomePick, setHtAwayPick,
  swapSquad, fatigueMap, MAX_SUBS,
  runSecondHalf, subToast, matchContext, userSide,
}: Props) {
  const htEvents = replayEvents;
  const hShots = htEvents.filter(e => ['goal','miss','post','save'].includes(e.type) && (e.type === 'save' ? e.teamId !== initialHome.id : e.teamId === initialHome.id)).length;
  const aShots = htEvents.filter(e => ['goal','miss','post','save'].includes(e.type) && (e.type === 'save' ? e.teamId !== initialAway.id : e.teamId === initialAway.id)).length;
  const hSoT = htEvents.filter(e => (e.type === 'goal' && e.teamId === initialHome.id) || (e.type === 'save' && e.teamId !== initialHome.id)).length;
  const aSoT = htEvents.filter(e => (e.type === 'goal' && e.teamId === initialAway.id) || (e.type === 'save' && e.teamId !== initialAway.id)).length;
  const totalPoss = htEvents.filter(e => e.type === 'possession').length;
  const homePoss = htEvents.filter(e => e.type === 'possession' && e.teamId === initialHome.id).length;
  const homePct = totalPoss > 0 ? Math.round((homePoss / totalPoss) * 100) : 50;

  return (
    <div className="halftime-overlay">
      <div className="halftime-inner">
        <div className="halftime-title">Intervalo</div>

        <div className="ht-mini-stats">
          <div className="ht-stat-row"><span style={{ color: home.color }}>{hShots}</span><span className="ht-stat-label">Finaliza\u00E7\u00F5es</span><span style={{ color: away.color }}>{aShots}</span></div>
          <div className="ht-stat-row"><span style={{ color: home.color }}>{hSoT}</span><span className="ht-stat-label">No Alvo</span><span style={{ color: away.color }}>{aSoT}</span></div>
          <div className="ht-stat-row"><span style={{ color: home.color }}>{homePct}%</span><span className="ht-stat-label">Posse de Bola</span><span style={{ color: away.color }}>{100 - homePct}%</span></div>
        </div>

        {online ? (
          <div className="halftime-teams" style={{ justifyContent: 'center' }}>
            <div className="halftime-team">
              <strong style={{ color: online.isHost ? home.color : away.color }}>
                {online.isHost ? home.abbreviation : away.abbreviation} (Voc\u00EA)
              </strong>
              {online.isHost ? <>
                <TacticPresets onApply={updateHome} currentStrategy={home.strategy} />
                <TacticEditor strategy={home.strategy} onChange={updateHome} />
              </> : <>
                <TacticPresets onApply={updateAway} currentStrategy={away.strategy} />
                <TacticEditor strategy={away.strategy} onChange={updateAway} />
              </>}
            </div>
          </div>
        ) : matchContext && matchContext !== 'regular' ? (() => {
            const isHome = userSide !== 'away';
            const userTeam = isHome ? home : away;
            const userStrategy = isHome
              ? { update: updateHome, strategy: home.strategy }
              : { update: updateAway, strategy: away.strategy };
            return (
          <div className="halftime-teams" style={{ justifyContent: 'center' }}>
            <div className="halftime-team">
              <strong style={{ color: userTeam.color }}>{userTeam.abbreviation} (Você)</strong>
              <TacticPresets onApply={userStrategy.update} currentStrategy={userStrategy.strategy} />
              <TacticEditor strategy={userStrategy.strategy} onChange={userStrategy.update} />
            </div>
          </div>
            );
          })() : (
          <div className="halftime-teams">
            <div className="halftime-team">
              <strong style={{ color: home.color }}>{home.abbreviation}</strong>
              <TacticPresets onApply={updateHome} currentStrategy={home.strategy} />
              <TacticEditor strategy={home.strategy} onChange={updateHome} />
            </div>
            <span className="halftime-vs">vs</span>
            <div className="halftime-team">
              <strong style={{ color: away.secondaryColor }}>{away.abbreviation}</strong>
              <TacticPresets onApply={updateAway} currentStrategy={away.strategy} />
              <TacticEditor strategy={away.strategy} onChange={updateAway} />
            </div>
          </div>
        )}

        <details className="ht-squad-details">
          <summary>
            {online
              ? <>Substitui\u00E7\u00F5es \u00B7 <span style={{ color: online.isHost ? home.color : away.color }}>{online.isHost ? home.abbreviation : away.abbreviation} {online.isHost ? subsHome : subsAway}/{MAX_SUBS}</span>
                  <span className="sub-window-breakdown"> ({formatSubWindows(online.isHost ? subWindowsHome : subWindowsAway)})</span></>
              : matchContext && matchContext !== 'regular'
              ? <>Substitui\u00E7\u00F5es \u00B7 <span style={{ color: (userSide !== 'away' ? home : away).color }}>{userSide !== 'away' ? home.abbreviation : away.abbreviation} {userSide !== 'away' ? subsHome : subsAway}/{MAX_SUBS}</span>
                  <span className="sub-window-breakdown"> ({formatSubWindows(userSide !== 'away' ? subWindowsHome : subWindowsAway)})</span></>
              : <>Substitui\u00E7\u00F5es \u00B7 <span style={{ color: home.color }}>{home.abbreviation} {subsHome}/{MAX_SUBS}</span> \u00B7 <span style={{ color: away.color }}>{away.abbreviation} {subsAway}/{MAX_SUBS}</span>
                  <span className="sub-window-breakdown"> ({formatSubWindows(subWindowsHome)} / {formatSubWindows(subWindowsAway)})</span></>
            }
          </summary>
          <div className="ht-squad-grid">
            {(online
              ? [online.isHost
                  ? ['home', home, setHome, htHomePick, setHtHomePick, true] as const
                  : ['away', away, setAway, htAwayPick, setHtAwayPick, true] as const]
              : matchContext && matchContext !== 'regular'
              ? [
                  [userSide !== 'away' ? 'home' : 'away', userSide !== 'away' ? home : away, userSide !== 'away' ? setHome : setAway, userSide !== 'away' ? htHomePick : htAwayPick, userSide !== 'away' ? setHtHomePick : setHtAwayPick, true],
                  [userSide !== 'away' ? 'away' : 'home', userSide !== 'away' ? away : home, userSide !== 'away' ? setAway : setHome, userSide !== 'away' ? htAwayPick : htHomePick, userSide !== 'away' ? setHtAwayPick : setHtHomePick, false],
                ] as const
              : [
                  ['home', home, setHome, htHomePick, setHtHomePick, true],
                  ['away', away, setAway, htAwayPick, setHtAwayPick, true],
                ] as const
            ).map(([side, team, setTeam, pick, setPick, canEdit]) => {
              const benchPlayers = team.squad.slice(11);
              const starters = team.squad.slice(0, 11);
              const pickIdx = team.squad.findIndex(sp => sp.id === pick);
              const pickIsBench = pickIdx >= 11;
              const pickPlayer = pickIdx >= 0 ? team.squad[pickIdx] : null;
              return (
                <div key={side} className="ht-squad-col">
                  <strong style={{ color: side === 'home' ? home.color : away.color, fontSize: 11 }}>
                    {side === 'home' ? home.abbreviation : away.abbreviation} {!canEdit ? '(advers\u00E1rio)' : ''}
                  </strong>
                  <div className="ht-sub-group-label">Titulares</div>
                  {starters.map((p, i) => {
                    const isPicked = p.id === pick;
                    const canSwap = pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position && pickIdx !== i;
                    const fatigue = fatigueMap?.[p.id] ?? p.currentFatigue;
                    const effOvr = Math.round(playerOvr(p) * (1 - fatigue / 200));
                    const fatigueColor = fatigue > 70 ? '#ef4444' : fatigue > 45 ? '#f59e0b' : '#22c55e';
                    return (
                      <div key={p.id}
                        className={`ht-squad-row ${isPicked ? 'picked' : ''} ${canSwap && canEdit ? 'clickable' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (!canEdit) return;
                          if (pick && pickIsBench && team.squad[pickIdx].position === p.position) {
                            swapSquad(team, setTeam, pickIdx, i, side);
                            setPick(null);
                          } else {
                            setPick(isPicked ? null : p.id);
                          }
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { (e.currentTarget as HTMLElement).click(); } }}>
                        <span className="sq-num">#{p.number}</span>
                        <span className="sq-name">{p.name}</span>
                        <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                        <span className="sq-ovr">
                          {playerOvr(p)}
                          {fatigue > 20 && <span style={{ color: fatigueColor, fontSize: 9, marginLeft: 3 }}>\u25B6{effOvr}</span>}
                        </span>
                      </div>
                    );
                  })}
                  <div className="ht-sub-group-label">Reservas</div>
                  {benchPlayers.map((p) => {
                    const isPicked = p.id === pick;
                    const bi = team.squad.findIndex(sp => sp.id === p.id);
                    const benchFatigue = p.currentFatigue;
                    const benchEffOvr = Math.round(playerOvr(p) * (1 - benchFatigue / 200));
                    return (
                      <div key={p.id}
                        className={`ht-squad-row ${isPicked ? 'picked' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          if (pick && !pickIsBench && pickPlayer && pickPlayer.position === p.position) {
                            swapSquad(team, setTeam, pickIdx, bi, side);
                            setPick(null);
                          } else {
                            setPick(isPicked ? null : p.id);
                          }
                        }}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { (e.currentTarget as HTMLElement).click(); } }}>
                        <span className="sq-num">#{p.number}</span>
                        <span className="sq-name">{p.name}</span>
                        <span className={`sq-pos pos-${p.position.toLowerCase()}`}>{p.position}</span>
                        <span className="sq-ovr">
                          {playerOvr(p)}
                          {benchFatigue > 20 && <span style={{ color: '#22c55e', fontSize: 9, marginLeft: 3 }}>\u25B6{benchEffOvr}</span>}
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </details>

        {subToast && (
          <div className="sub-toast">{subToast}</div>
        )}

        {online ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
            <button className="simulate-btn" onClick={sendReadyHalftime} disabled={online.isHost ? hostReady : guestReady}>
              {online.isHost
                ? (hostReady ? (guestReady ? 'Iniciar 2\u00BA Tempo...' : 'Aguardando oponente...') : 'Pronto')
                : (guestReady ? (hostReady ? 'Iniciar 2\u00BA Tempo...' : 'Aguardando oponente...') : 'Pronto')}
            </button>
            <span style={{ fontSize: 11, opacity: 0.6 }}>
              {online.isHost
                ? (hostReady ? (guestReady ? '\u2713 Ambos prontos' : '\u2713 Voc\u00EA \u00B7 Aguardando visitante') : 'Clique em Pronto')
                : (guestReady ? (hostReady ? '\u2713 Ambos prontos' : '\u2713 Voc\u00EA \u00B7 Aguardando host') : 'Clique em Pronto')}
            </span>
          </div>
        ) : (
          <button className="simulate-btn" onClick={() => runSecondHalf(home, away)}>
            Iniciar 2\u00BA Tempo
          </button>
        )}
      </div>
    </div>
  );
}
