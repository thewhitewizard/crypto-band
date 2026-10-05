# crypto-band

Mod Claude Code : un bandeau au-dessus du prompt avec les cours crypto et leur variation sur 24 h,
en direct depuis l'API publique CoinGecko (aucune clé, aucun serveur à installer).

```
RLC 0,5735 $ ▲ +58,31 %  ·  ETH 2 715,23 $ ▼ -0,49 %  ·  BTC 86 041 $ ▲ +0,91 %      Masquer
```

## Installer

Copier ce dossier n'importe où, puis lancer Claude Code avec :

```bash
claude --plugin-dir /chemin/vers/crypto-band
```

Les mods sont en accès anticipé : l'API peut changer d'une version de Claude Code à l'autre.

## Utiliser

| Action | Effet |
|---|---|
| bouton **Masquer** | cache le bandeau pour la session |
| `/crypto off` | désactive le bandeau, y compris aux sessions suivantes |
| `/crypto on` | le réactive |
| `/crypto` | affiche les cours dans la conversation |

## Changer les monnaies

En haut de `hooks/register.tsx` : `COINS` (identifiants CoinGecko, visibles dans l'URL d'une page coingecko.com),
`CURRENCY` (`usd` ou `eur`) et `REFRESH_MS` (2 min par défaut : l'API gratuite limite le nombre d'appels).

## Fichiers

- `.claude-plugin/plugin.json` : nom et description du plugin
- `hooks/hooks.json` : le module à charger
- `hooks/register.tsx` : le mod
- `hooks/register.test.ts` : les tests (`claude plugin test .`)
- `types/index.d.ts` : le type des valeurs que le mod garde en mémoire
