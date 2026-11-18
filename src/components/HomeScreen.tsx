import type { ReactNode } from 'react';
import type { Difficulty } from '../engine/matchConfig';
import { getDifficultyLabel } from '../engine/matchConfig';
import styles from './HomeScreen.module.css';
import DailyGoalsCard from './DailyGoalsCard';
import { crestSrc } from '../utils/crest';
import { Icon, type IconName } from './ui';

export interface NextMatchSide {
  name: string;
  crest?: string;
}

export interface CareerResume {
  teamName: string;
  crest?: string;
  /** Ex.: "Premier League · Temporada 1 · Rodada 4" */
  detail: string;
  /** Próximo jogo do clube do usuário na liga; ausente quando a liga acabou. */
  nextMatch?: { home: NextMatchSide; away: NextMatchSide } | null;
}

const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

interface Props {
  onSingleMatch: () => void;
  onQuickPlay: () => void;
  onLeague: () => void;
  onCareer: () => void;
  onCup: () => void;
  onAchievements: () => void;
  onOnline: () => void;
  onFriendLeague?: () => void;
  difficulty: Difficulty;
  onSetDifficulty: (d: Difficulty) => void;
  /** Carreira salva: vira o card de destaque no topo. */
  careerResume?: CareerResume | null;
}

interface ModeAction {
  label: string;
  icon?: IconName;
  onClick: () => void;
}

interface ModeCardProps {
  icon: IconName;
  name: string;
  desc: string;
  /** Card de ação única: o card inteiro é o botão. */
  onClick?: () => void;
  /** Card com duas ações explícitas (cada botão diz o que faz). */
  actions?: ModeAction[];
}

function ModeCard({ icon, name, desc, onClick, actions }: ModeCardProps) {
  const body: ReactNode = (
    <>
      <Icon name={icon} size={84} className={styles.modeArt} />
      <span className={styles.modeTop}>
        <span className={styles.modeIcon} aria-hidden="true"><Icon name={icon} size={22} /></span>
        {onClick && <Icon name="chevron-right" size={18} className={styles.modeArrow} />}
      </span>
      <span className={styles.modeText}>
        <span className={styles.modeName}>{name}</span>
        <span className={styles.modeDesc}>{desc}</span>
      </span>
    </>
  );

  if (onClick) {
    return <button className={styles.modeCard} onClick={onClick}>{body}</button>;
  }
  return (
    <div className={styles.modeCard}>
      {body}
      <div className={styles.modeActions}>
        {actions?.map(a => (
          <button key={a.label} className={styles.modeAction} onClick={a.onClick}>
            {a.icon && <Icon name={a.icon} size={14} />}
            {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function NextMatch({ home, away }: { home: NextMatchSide; away: NextMatchSide }) {
  return (
    <div className={styles.nextMatch}>
      <span className={styles.nextLabel}>Próximo jogo</span>
      <div className={styles.versus}>
        <span className={`${styles.side} ${styles.sideHome}`}>
          <img src={crestSrc(home.crest)} alt="" className={styles.versusCrest} />
          <span className={styles.sideName}>{home.name}</span>
        </span>
        <span className={styles.versusX} aria-hidden="true">x</span>
        <span className={`${styles.side} ${styles.sideAway}`}>
          <span className={styles.sideName}>{away.name}</span>
          <img src={crestSrc(away.crest)} alt="" className={styles.versusCrest} />
        </span>
      </div>
    </div>
  );
}

export default function HomeScreen({ onSingleMatch, onQuickPlay, onLeague, onCareer, onCup, onAchievements, onOnline, onFriendLeague, difficulty, onSetDifficulty, careerResume }: Props) {
  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.pitch} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>Foot<span>Plan</span></h1>
          <p className={styles.subtitle}>Simulador Tático</p>
        </div>
        <button className={styles.iconBtn} onClick={onAchievements} aria-label="Conquistas">
          <Icon name="medal" size={20} />
        </button>
      </header>

      <section className={styles.careerCard} aria-label="Modo carreira">
        <Icon name="manager" size={120} className={styles.careerArt} />
        <h2 className={styles.careerTitle}>Modo carreira</h2>

        {careerResume ? (
          <div className={styles.careerClub}>
            <img src={crestSrc(careerResume.crest)} alt="" className={styles.resumeCrest} />
            <div className={styles.modeText}>
              <span className={styles.resumeTeam}>{careerResume.teamName}</span>
              <span className={styles.modeDesc}>{careerResume.detail}</span>
            </div>
          </div>
        ) : (
          <p className={styles.careerDesc}>Progrida por temporadas com seu elenco, transferências e reputação de técnico.</p>
        )}

        <button className={styles.careerCta} onClick={onCareer}>
          <Icon name="play" size={16} />
          <span>{careerResume ? 'Continuar carreira' : 'Começar carreira'}</span>
          <Icon name="chevron-right" size={16} />
        </button>

        {careerResume?.nextMatch && (
          <NextMatch home={careerResume.nextMatch.home} away={careerResume.nextMatch.away} />
        )}
      </section>

      <DailyGoalsCard />

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Modos de jogo</h2>
          <div className={styles.difficulty} role="group" aria-label="Dificuldade das partidas">
            <span className={styles.difficultyLabel}>Dificuldade</span>
            <div className={styles.difficultyBtns}>
              {DIFFICULTIES.map(d => (
                <button
                  key={d}
                  className={`${styles.diffBtn} ${d === difficulty ? styles.diffActive : ''}`}
                  aria-pressed={d === difficulty}
                  onClick={() => {
                    onSetDifficulty(d);
                    try { localStorage.setItem('fp:difficulty', d); } catch {}
                  }}
                >
                  {getDifficultyLabel(d)}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.grid}>
          <ModeCard
            icon="ball"
            name="Partida"
            desc="Amistoso entre dois times"
            actions={[
              { label: 'Escolher times', onClick: onSingleMatch },
              { label: 'Jogo rápido', icon: 'bolt', onClick: onQuickPlay },
            ]}
          />
          <ModeCard
            icon="trophy"
            name="Competições"
            desc="Pontos corridos ou mata-mata"
            actions={[
              { label: 'Campeonato', onClick: onLeague },
              { label: 'Copa', onClick: onCup },
            ]}
          />
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>Com amigos</h2>
        </div>
        <div className={styles.grid}>
          <ModeCard icon="globe" name="Jogar online" desc="Partida ao vivo pelo código da sala" onClick={onOnline} />
          {onFriendLeague && (
            <ModeCard icon="users" name="Liga de amigos" desc="Cada um comanda um clube" onClick={onFriendLeague} />
          )}
        </div>
      </section>

      <footer className={styles.footer}>
        <span className={styles.version}>v{__APP_VERSION__}</span>
        <nav className={styles.legalLinks}>
          <a href={`${import.meta.env.BASE_URL}privacy.html`} target="_blank" rel="noopener noreferrer">Privacidade</a>
          <span className={styles.legalSep}>·</span>
          <a href={`${import.meta.env.BASE_URL}terms.html`} target="_blank" rel="noopener noreferrer">Termos</a>
        </nav>
      </footer>
    </div>
  );
}
