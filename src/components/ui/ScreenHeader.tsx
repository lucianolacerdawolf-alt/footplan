import type { ReactNode } from 'react';
import Button from './Button';
import Icon from './Icon';
import styles from './ScreenHeader.module.css';

interface Props {
  /** Título da tela (ex.: "Classificação"). */
  title: ReactNode;
  /** Linha pequena acima do título (ex.: nome da liga). */
  kicker?: ReactNode;
  /** Sem onBack não há botão (telas das abas da carreira, que já têm a barra). */
  onBack?: () => void;
  backDisabled?: boolean;
  /** Ação opcional à direita (ex.: um botão compacto). */
  right?: ReactNode;
}

/**
 * Cabeçalho único das telas: "← Voltar" à esquerda, título (com kicker opcional)
 * e uma ação à direita. Antes cada tela tinha o seu (logo central, "←" solto,
 * "Menu Principal" repetindo o Voltar…).
 */
export default function ScreenHeader({ title, kicker, onBack, backDisabled, right }: Props) {
  return (
    <header className={styles.header}>
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} disabled={backDisabled} aria-label="Voltar" className={styles.back}>
          <Icon name="arrow-left" size={14} /> Voltar
        </Button>
      )}
      <div className={styles.titles}>
        {kicker && <span className={styles.kicker}>{kicker}</span>}
        <h1 className={styles.title}>{title}</h1>
      </div>
      {right && <div className={styles.right}>{right}</div>}
    </header>
  );
}
