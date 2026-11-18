import type { FormResult } from '../engine/careerSummary';
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

interface Props {
  onSingleMatch: () => void;
  onQuickPlay: () => void;
  onLeague: () => void;
  onCareer: () => void;
  onCup: () => void;
  onAchievements: () => void;
  onOnline: () => void;
  onFriendLeague?: () => void;
  /** Começa uma carreira do zero (o save atual só é trocado depois de confirmar). */
  onNewCareer?: () => void;
  /** Abre a tela de Perfil (ícone de bonequinho no topo). */
  onProfile?: () => void;
  /** Abre Configurações (dificuldade, velocidade, lembretes, dados…). */
  onSettings?: () => void;
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
      <span className={styles.modeIcon} aria-hidden="true"><Icon name={icon} size={22} /></span>
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

export default function HomeScreen({ onSingleMatch, onQuickPlay, onLeague, onCareer, onCup, onAchievements, onOnline, onFriendLeague, onNewCareer, onProfile, onSettings, careerResume }: Props) {
  return (
    <div className={`${styles.screen} app-screen`}>
      <div className={styles.pitch} aria-hidden="true" />

      <header className={styles.header}>
        <div className={styles.brand}>
          <h1 className={styles.title}>Foot<span>Plan</span></h1>
          <p className={styles.subtitle}>Simulador Tático</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.iconBtn} onClick={onAchievements} aria-label="Conquistas">
            <Icon name="medal" size={20} />
          </button>
          {onProfile && (
            <button className={styles.iconBtn} onClick={onProfile} aria-label="Perfil">
              <Icon name="user" size={20} />
            </button>
          )}
          {onSettings && (
            <button className={styles.iconBtn} onClick={onSettings} aria-label="Configurações">
              <Icon name="settings" size={20} />
            </button>
          )}
        </div>
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

        <div className={styles.careerActions}>
          <button className={styles.careerCta} onClick={onCareer}>
            <Icon name="play" size={16} />
            <span>{careerResume ? 'Continuar' : 'Começar carreira'}</span>
            <Icon name="chevron-right" size={16} />
          </button>
          {careerResume && onNewCareer && (
            <button className={styles.newCareerBtn} onClick={onNewCareer} title="Começar uma carreira do zero">
              Nova<br />carreira
            </button>
          )}
        </div>

        {careerResume?.nextMatch && (
          <NextMatch home={careerResume.nextMatch.home} away={careerResume.nextMatch.away} />
        )}
      </section>

      <DailyGoalsCard />

      <section className={styles.section} aria-label="Modos de jogo">
        <h2 className={styles.sectionTitle}>Jogar</h2>
        <div className={styles.grid}>
          <ModeCard icon="ball" name="Partida" desc="Amistoso" onClick={onSingleMatch} />
          <ModeCard icon="calendar" name="Campeonato" desc="Pontos corridos" onClick={onLeague} />
          <ModeCard icon="trophy" name="Copa" desc="Mata-mata" onClick={onCup} />
          <ModeCard icon="bolt" name="Rápido" desc="Times aleatórios" onClick={onQuickPlay} />
          <ModeCard icon="globe" name="Online" desc="Com um amigo" onClick={onOnline} />
          {onFriendLeague && (
            <ModeCard icon="users" name="Liga amigos" desc="1 rodada/dia" onClick={onFriendLeague} />
          )}
        </div>
      </section>
    </div>
  );
}
