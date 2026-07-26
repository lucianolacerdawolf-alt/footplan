import type React from 'react';

export function fireClick(e: React.KeyboardEvent<HTMLElement>): void {
  if (e.key === 'Enter' || e.key === ' ') {
    (e.currentTarget as HTMLElement).click();
  }
}
