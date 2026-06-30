#!/usr/bin/env node
// Busca logos de todos os times via TheSportsDB e atualiza os arquivos de liga.
// Uso: node scripts/fetch-logos.mjs

import { readFileSync, writeFileSync } from 'fs';

const LEAGUES = [
  { sportsdb: 'Spanish La Liga',    file: 'src/data/leagues/laLiga.ts' },
  { sportsdb: 'German Bundesliga',  file: 'src/data/leagues/bundesliga.ts' },
  { sportsdb: 'Italian Serie A',    file: 'src/data/leagues/serieA.ts' },
];

// Normaliza nome para comparação: remove acentos, caracteres especiais e caixa
function norm(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function findMatch(ourName, apiTeams) {
  const n = norm(ourName);
  return (
    apiTeams.find(t => norm(t.strTeam) === n) ??
    apiTeams.find(t => norm(t.strTeam).includes(n) || n.includes(norm(t.strTeam))) ??
    null
  );
}

async function fetchTeams(leagueName) {
  const url = `https://www.thesportsdb.com/api/v1/json/3/search_all_teams.php?l=${encodeURIComponent(leagueName)}`;
  console.log(`  GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.teams ?? [];
}

// Substitui o último elemento do tuple de cada time pelo novo logoUrl
function patchFile(filePath, logoMap) {
  let src = readFileSync(filePath, 'utf-8');

  // Remove helper espn() se existir
  src = src.replace(/^const espn = \(id: number\).*\n\n/m, '');

  let patched = 0;
  for (const [teamName, logoUrl] of Object.entries(logoMap)) {
    // Procura linha com o nome do time entre aspas simples como 1º elemento do tuple
    const escapedName = teamName.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&');
    // Captura tudo até a vírgula antes do último elemento, e substitui esse último elemento
    const re = new RegExp(
      `(\\[\\s*'${escapedName}'(?:,[^\\]]+?),\\s*)(?:espn\\(\\d+\\)|'[^']*')(\\s*\\])`,
      'g'
    );
    const before = src;
    src = src.replace(re, `$1'${logoUrl}'$2`);
    if (src !== before) patched++;
  }

  writeFileSync(filePath, src, 'utf-8');
  return patched;
}

async function main() {
  for (const { sportsdb, file } of LEAGUES) {
    console.log(`\n=== ${sportsdb} ===`);
    let apiTeams;
    try {
      apiTeams = await fetchTeams(sportsdb);
    } catch (e) {
      console.error(`  ERRO ao buscar: ${e.message}`);
      continue;
    }
    console.log(`  ${apiTeams.length} times retornados pela API`);

    // Extrai nomes dos times do arquivo .ts
    const src = readFileSync(file, 'utf-8');
    const teamNames = [...src.matchAll(/^\s*\['([^']+)'/gm)].map(m => m[1]);
    console.log(`  ${teamNames.length} times no arquivo`);

    const logoMap = {};
    const missing = [];

    for (const name of teamNames) {
      const match = findMatch(name, apiTeams);
      if (match?.strBadge) {
        logoMap[name] = match.strBadge;
        console.log(`  ✓ ${name} → ${match.strTeam}`);
      } else {
        missing.push(name);
        console.log(`  ✗ ${name} — não encontrado`);
      }
    }

    const patched = patchFile(file, logoMap);
    console.log(`  ${patched}/${teamNames.length} times atualizados no arquivo`);
    if (missing.length) console.log(`  Sem logo: ${missing.join(', ')}`);
  }

  console.log('\nConcluído. Verifique as mudanças com: git diff src/data/leagues/');
}

main().catch(e => { console.error(e); process.exit(1); });
