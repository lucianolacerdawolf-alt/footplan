import { useMemo } from 'react';
import type { Team } from '../engine/types';
import { MENTALITY_LABELS } from '../engine/types';
import { useH2H } from '../hooks/useH2H';
import { playerOvr } from '../utils/playerOvr';
import { generateStadium } from '../utils/stadiums';
import { isDerby } from '../engine/rivalries';
import { generateTacticalComment } from '../engine/tacticalCommentary';
import { pickHighlights } from '../utils/highlights';
import styles from './MatchdayScreen.module.css';
import { crestSrc } from '../utils/crest';

interface Props {
  homeTeam: Team;
  awayTeam: Team;
  contextLabel: string;
  onPlay: () => void;
  onBack: () => void;
  roundLabel?: string;
}

function getWeather(): { icon: string; label: string } {
  const weathers = [
    { icon: '☀️', label: 'Céu limpo' },
    { icon: '⛅', label: 'Parcialmente nublado' },
    { icon: '☁️', label: 'Nublado' },
    { icon: '🌧️', label: 'Chuva leve' },
    { icon: '🌙', label: 'Noite clara' },
    { icon: '💨', label: 'Ventania' },
  ];
  return weathers[Math.floor(Math.random() * weathers.length)];
}

export default function MatchdayScreen({ homeTeam, awayTeam, contextLabel, onPlay, onBack, roundLabel }: Props) {
  const { get: getH2H } = useH2H();
  const h2h = getH2H(homeTeam.id, awayTeam.id);
  const weather = useMemo(() => getWeather(), []);
  const derby = isDerby(homeTeam.id, awayTeam.id);
  const stadium = useMemo(() => {
    const sid = (homeTeam.id.charCodeAt(homeTeam.id.length - 1) || 0) + (awayTeam.id.length > 0 ? awayTeam.id.charCodeAt(0) : 0);
    return generateStadium(homeTeam.name, sid);
  }, [homeTeam.name, homeTeam.id, awayTeam.id]);

  const topHome = useMemo(() => pickHighlights(homeTeam.squad), [homeTeam.squad]);
  const topAway = useMemo(() => pickHighlights(awayTeam.squad), [awayTeam.squad]);

  const tacticalComment = useMemo(() =>
    generateTacticalComment(
      homeTeam.name, awayTeam.name,
      homeTeam.strategy.formation, awayTeam.strategy.formation,
      homeTeam.strategy.mentality, awayTeam.strategy.mentality,
      homeTeam.strategy.defensiveLine, awayTeam.strategy.defensiveLine,
    ), [homeTeam, awayTeam]);

  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.hero}>
        <div className={styles.heroBg}>
          <div className={styles.vsBar}>
            <div className={styles.teamSide}>
              <img className={styles.logo} src={crestSrc(homeTeam.logoUrl)} alt={homeTeam.name} />
              <span className={styles.teamName}>{homeTeam.name}</span>
              <span className={styles.teamAbbr}>{homeTeam.abbreviation}</span>
            </div>
            <div className={styles.vsCenter}>
              <span className={styles.vsBadge}>VS</span>
            </div>
            <div className={styles.teamSide}>
              <img className={styles.logo} src={crestSrc(awayTeam.logoUrl)} alt={awayTeam.name} />
              <span className={styles.teamName}>{awayTeam.name}</span>
              <span className={styles.teamAbbr}>{awayTeam.abbreviation}</span>
            </div>
          </div>
        </div>

        <div className={styles.matchInfo}>
          {derby && <span className={styles.derbyBadge}>Clássico</span>}
          <span className={styles.contextBadge}>{contextLabel}</span>
          {roundLabel && <span className={styles.roundBadge}>{roundLabel}</span>}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.infoGrid}>
          {/* Os três cards seguem o mesmo contrato: rótulo da categoria em cima,
            * valor embaixo. Antes a segunda linha era usada para três coisas
            * diferentes (detalhe do valor, nome da categoria e outro valor). */}
          <div className={styles.infoCard}>
            <span className={styles.cardIcon}>🏟️</span>
            <span className={styles.cardLabel}>Estádio</span>
            <span className={styles.cardValue}>{stadium.name}</span>
            <span className={styles.cardSub}>{stadium.capacity.toLocaleString()} lugares</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.cardIcon}>{weather.icon}</span>
            <span className={styles.cardLabel}>Clima</span>
            <span className={styles.cardValue}>{weather.label}</span>
          </div>
          <div className={styles.infoCard}>
            <span className={styles.cardIcon}>📊</span>
            <span className={styles.cardLabel}>Formações</span>
            <span className={styles.cardValue}>{`${homeTeam.strategy.formation} vs ${awayTeam.strategy.formation}`}</span>
            <span className={styles.cardSub}>{MENTALITY_LABELS[homeTeam.strategy.mentality]}</span>
          </div>
        </div>

        {derby && (
          <div className={styles.derbyBanner}>
            <span className={styles.derbyIcon}>⚔️</span>
            <span>Dérbi! A rivalidade promete jogo intenso com mais faltas e emoção.</span>
          </div>
        )}

        {/* Sem histórico a seção inteira desaparecia e deixava um buraco de várias
          * centenas de pixels antes da barra de ações. Estado vazio explícito
          * preenche o espaço com informação em vez de vazio. */}
        {(!h2h || h2h.wins + h2h.draws + h2h.losses === 0) && (
          <div className={styles.h2hSection}>
            <h3 className={styles.sectionTitle}>Histórico de Confrontos</h3>
            <p className={styles.h2hEmpty}>
              Primeiro encontro entre {homeTeam.name} e {awayTeam.name}. O retrospecto
              começa a contar a partir desta partida.
            </p>
          </div>
        )}

        {h2h && (h2h.wins + h2h.draws + h2h.losses > 0) && (
          <div className={styles.h2hSection}>
            <h3 className={styles.sectionTitle}>Histórico de Confrontos</h3>
            <div className={styles.h2hStats}>
              <div className={styles.h2hStat}>
                <span className={styles.h2hValue}>{h2h.wins}</span>
                <span className={styles.h2hLabel}>Vitórias {homeTeam.abbreviation}</span>
              </div>
              <div className={styles.h2hStat}>
                <span className={styles.h2hValue}>{h2h.draws}</span>
                <span className={styles.h2hLabel}>Empates</span>
              </div>
              <div className={styles.h2hStat}>
                <span className={styles.h2hValue}>{h2h.losses}</span>
                <span className={styles.h2hLabel}>Vitórias {awayTeam.abbreviation}</span>
              </div>
            </div>
            {h2h.log && h2h.log.length > 0 && (
              <div className={styles.h2hLog}>
                {h2h.log.map((m, i) => (
                  <span key={i} className={`${styles.h2hResult} ${m.result === 'W' ? styles.resultWin : m.result === 'L' ? styles.resultLoss : styles.resultDraw}`}>
                    {m.result === 'W' ? 'V' : m.result === 'D' ? 'E' : 'D'} {m.gf}-{m.ga}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        <div className={styles.playersSection}>
          <h3 className={styles.sectionTitle}>Jogadores em Destaque</h3>
          <div className={styles.playersGrid}>
            <div className={styles.playerList}>
              {topHome.map(p => (
                <div key={p.id} className={styles.playerRow}>
                  <span className={styles.playerColor} style={{ background: homeTeam.color }} />
                  <span className={styles.playerName}>{p.name}</span>
                  <span className={styles.playerPos}>{p.position}</span>
                  <span className={styles.playerOvr}>{playerOvr(p)}</span>
                </div>
              ))}
            </div>
            <div className={styles.playerList}>
              {topAway.map(p => (
                <div key={p.id} className={styles.playerRow}>
                  <span className={styles.playerColor} style={{ background: awayTeam.color }} />
                  <span className={styles.playerName}>{p.name}</span>
                  <span className={styles.playerPos}>{p.position}</span>
                  <span className={styles.playerOvr}>{playerOvr(p)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {tacticalComment && (
          <div className={styles.tacticalCard}>
            <span className={styles.tacticalIcon}>📋</span>
            <span className={styles.tacticalText}>{tacticalComment}</span>
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.backBtn} onClick={onBack}>Voltar</button>
        <button className={styles.playBtn} onClick={onPlay}>
          Iniciar Partida
        </button>
      </div>
    </div>
  );
}
