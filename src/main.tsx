import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initNativeShell } from './services/native'
import { installCrashReporting } from './utils/crashReport'
import { runSaveMigrations } from './utils/saveMigration'

installCrashReporting();

// Antes de qualquer render/leitura de save: migra saves de esquemas antigos e
// carimba a versão atual. Não lança — se falhar, o app segue normalmente.
runSaveMigrations();

document.documentElement.style.setProperty('--bg-image', `url(${import.meta.env.BASE_URL}fundo.webp)`);

// No-op no navegador. A safe area em si já está resolvida: index.html tem
// viewport-fit=cover e #root consome env(safe-area-inset-*) — com targetSdk 36
// o Android força edge-to-edge, que é exatamente o caso que esse CSS cobre.
void initNativeShell();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
