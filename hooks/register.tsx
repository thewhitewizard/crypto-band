import { atom, read, update } from 'claude-code'
import type { HookFor, Register } from 'claude-code'

import type { Coin, Summary } from '../types'

// Bandeau au-dessus du prompt : cours crypto et variation 24 h, en direct depuis l'API publique CoinGecko.
// Désactivation : bouton « Masquer » (session) ou /crypto off (gardé d'une session à l'autre).

// --- Réglages -------------------------------------------------------------------------
const COINS = ['iexec-rlc', 'ethereum', 'bitcoin'] // identifiants CoinGecko, dans l'ordre d'affichage
const CURRENCY = 'usd'                              // devise des prix
const REFRESH_MS = 120_000                          // 2 min : l'API gratuite limite le nombre d'appels
// ---------------------------------------------------------------------------------------

const API = 'https://api.coingecko.com/api/v3/coins/markets'
const STORE_KEY = 'enabled' // dans $.store, propre à ce plugin
const CURRENCY_SIGNS: Record<string, string> = { usd: '$', eur: '€' }

type Api = Parameters<HookFor<'session.start'>>[0]
type Market = { id: string; symbol: string; current_price: number | null; price_change_percentage_24h: number | null }

const summary = atom({ plugin: 'crypto-band', key: 'summary' } as const, null)
const isEnabled = atom({ plugin: 'crypto-band', key: 'isEnabled' } as const, true)
const isHidden = atom({ plugin: 'crypto-band', key: 'isHidden' } as const, false)

export const fetchSummary = async ($: Api): Promise<Summary> => {
  try {
    const url = `${API}?vs_currency=${CURRENCY}&ids=${encodeURIComponent(COINS.join(','))}`
    const res = await $.http.fetch(url, { headers: { accept: 'application/json' } })
    if (res.status === 429) {
      throw new Error('limite de CoinGecko atteinte, réessai au prochain rafraîchissement')
    }
    if (!res.ok) {
      throw new Error(`CoinGecko HTTP ${res.status}`)
    }
    const markets = JSON.parse(res.text) as Market[]
    const coins: Coin[] = markets
      .filter(m => m.current_price !== null)
      .sort((a, b) => COINS.indexOf(a.id) - COINS.indexOf(b.id))
      .map(m => ({ symbol: m.symbol, price: m.current_price ?? 0, change24h: m.price_change_percentage_24h ?? 0 }))
    if (coins.length === 0) {
      throw new Error(`aucune monnaie trouvée pour « ${COINS.join(',')} »`)
    }
    return { coins, currency: CURRENCY, error: null }
  } catch (error) {
    return { coins: [], currency: CURRENCY, error: error instanceof Error ? error.message : String(error) }
  }
}

// Prix lisible quelle que soit sa grandeur : 0,5735 $ · 2 715,23 $ · 86 041 $
export const formatPrice = (price: number, currency: string) => {
  const decimals = price < 1 ? 4 : price < 10_000 ? 2 : 0
  const amount = price.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  return `${amount} ${CURRENCY_SIGNS[currency] ?? currency.toUpperCase()}`
}

export const formatChange = (change: number) =>
  `${change >= 0 ? '▲ +' : '▼ '}${change.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`

export const describe = (s: Summary) =>
  s.error
    ? `cours indisponibles (${s.error})`
    : s.coins
        .map(c => `${c.symbol.toUpperCase()} ${formatPrice(c.price, s.currency)} ${formatChange(c.change24h)}`)
        .join('  ·  ')

const refresh = async ($: Api) => {
  const next = await fetchSummary($)
  // Une erreur passagère (limite d'appels) ne remplace pas des cours déjà affichés
  await update($, summary, previous => (next.error && previous && !previous.error ? previous : next))
  return next
}

// Le minuteur de rafraîchissement (un rechargement du plugin l'annule avec l'ancien module)
let timer: { cancel: () => void } | undefined

const start = async ($: Api) => {
  timer?.cancel()
  await refresh($)
  timer = $.clock.every(REFRESH_MS, () => void refresh($))
}

const stop = () => {
  timer?.cancel()
  timer = undefined
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'crypto',
      description: 'Bandeau des cours crypto : /crypto [on|off|status]',
    })
    const enabled = (await $.store.get(STORE_KEY)) !== false
    await update($, isEnabled, () => enabled)
    if (enabled) {
      await start($)
    }
    return next(e)
  })

  on('command.run', { command: 'crypto' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'off') {
      stop()
      await $.store.set(STORE_KEY, false)
      await update($, isEnabled, () => false)
      return { text: 'Bandeau crypto désactivé (aussi pour les prochaines sessions). /crypto on pour le réactiver.' }
    }
    if (arg === 'on') {
      await $.store.set(STORE_KEY, true)
      await update($, isEnabled, () => true)
      await update($, isHidden, () => false)
      await start($)
      return { text: 'Bandeau crypto activé.' }
    }
    if (arg === '' || arg === 'status') {
      return { text: describe(await refresh($)) }
    }
    return { text: 'Usage : /crypto [on|off|status]' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, summary)
    if (e.props.hasSurvey || s === null || !(await read($, isEnabled)) || (await read($, isHidden))) {
      return next(e)
    }
    const { Box, Button, Text } = $.ui.resolve(e)

    return (
      <Box>
        {s.error ? (
          <Text dimColor>{describe(s)} </Text>
        ) : (
          s.coins.map((c, i) => (
            <Box key={c.symbol}>
              <Text dimColor>{i > 0 ? '  ·  ' : ''}</Text>
              <Text bold>{c.symbol.toUpperCase()} </Text>
              <Text>{formatPrice(c.price, s.currency)} </Text>
              <Text color={c.change24h >= 0 ? 'green' : 'red'}>{formatChange(c.change24h)}</Text>
            </Box>
          ))
        )}
        <Text> </Text>
        <Button key="hide" label="Masquer" plain dimColor onPress={() => update($, isHidden, () => true)} />
      </Box>
    )
  })
}
