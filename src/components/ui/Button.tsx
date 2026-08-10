import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ocupa 100% da largura do container. */
  block?: boolean;
  /** CTA "hero" com brilho e micro-escala (substitui o antigo `.start-btn`). */
  glow?: boolean;
}

/**
 * Botão base do app. Substitui os `.playBtn`/`.advanceBtn`/`.backBtn`/`resume-btn-*`
 * espalhados por telas. Encaminha `type="button"` por padrão (evita submits
 * acidentais dentro de forms) e repassa qualquer prop nativa (onClick, disabled,
 * aria-*, title…).
 */
export default function Button({
  variant = 'primary', size = 'md', block = false, glow = false, className = '', type = 'button', children, ...rest
}: Props) {
  const cls = [
    styles.btn,
    styles[variant],
    size !== 'md' ? styles[size] : '',
    block ? styles.block : '',
    glow ? styles.glow : '',
    className,
  ].filter(Boolean).join(' ');
  return <button type={type} className={cls} {...rest}>{children}</button>;
}
