import type { Difficulty } from '../engine/matchConfig';
import type { FormResult } from '../engine/careerSummary';
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
  /** Posição do clube na tabela; ausente/null antes do primeiro jogo. */
  position?: number | null;
  /** Últimos resultados (mais antigo → mais recente). */
  form?: FormResult[];
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

interface ModeCardProps {
  icon: IconName;
  name: string;
  desc: string;
  onClick: () => void;
}

function ModeCard({ icon, name, desc, onClick }: ModeCardProps) {
  return (
    <button className={styles.modeCard} onClick={onClick}>
      <Icon name={icon} size={84} className={styles.modeArt} />
      <span className={styles.modeTop}>
        <span className={styles.modeIcon} aria-hidden="true"><Icon name={icon} size={22} /></span>
        <Icon name="chevron-right" size={18} className={styles.modeArrow} />
      </span>
      <span className={styles.modeText}>
        <span className={styles.modeName}>{name}</span>
        <span className={styles.modeDesc}>{desc}</span>
      </span>
    </button>
  );
}

const FORM_LABEL: Record<FormResult, string> = { W: 'V', D: 'E', L: 'D' };
const FORM_NAME: Record<FormResult, string> = { W: 'vitória', D: 'empate', L: 'derrota' };

function CareerStats({ position, form }: { position?: number | null; form?: FormResult[] }) {
  const hasForm = !!form && form.length > 0;
  if (position == null && !hasForm) return null;
  return (
    <div className={styles.careerStats}>
      {position != null && <span className={styles.positionChip}>{position}º na tabela</span>}
      {hasForm && (
        <span className={styles.form} role="img" aria-label={`Últimos jogos: ${form.map(r => FORM_NAME[r]).join(', ')}`}>
          {form.map((r, i) => (
            <span key={i} className={`${styles.formDot} ${styles[`form${r}`]}`} aria-hidden="true">{FORM_LABEL[r]}</span>
          ))}
        </span>
      )}
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

        {careerResume && <CareerStats position={careerResume.position} form={careerResume.form} />}

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
          <label className={styles.difficultyPick}>
            <span className={styles.difficultyLabel}>Dificuldade</span>
            <span className={styles.difficultyValue} aria-hidden="true">{getDifficultyLabel(difficulty)}</span>
            <select
              className={styles.difficultySelect}
              aria-label="Dificuldade das partidas"
              value={difficulty}
              onChange={e => {
                const d = e.target.value as Difficulty;
                onSetDifficulty(d);
                try { localStorage.setItem('fp:difficulty', d); } catch {}
              }}
            >
              {DIFFICULTIES.map(d => (
                <option key={d} value={d}>{getDifficultyLabel(d)}</option>
              ))}
            </select>
            <Icon name="chevron-right" size={14} className={styles.difficultyChevron} />
          </label>
        </div>
        <div className={styles.grid}>
          <ModeCard icon="ball" name="Partida Única" desc="Escolha dois times" onClick={onSingleMatch} />
          <ModeCard icon="calendar" name="Campeonatos" desc="Pontos corridos" onClick={onLeague} />
          <ModeCard icon="bolt" name="Jogo Rápido" desc="Times aleatórios" onClick={onQuickPlay} />
          <ModeCard icon="trophy" name="Copas" desc="Mata-mata e pênaltis" onClick={onCup} />
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
