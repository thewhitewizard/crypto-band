import { describe, expect, mock, test } from 'claude-code/testing'

// Réponse de CoinGecko /coins/markets, volontairement dans le désordre
const MARKETS = [
  { id: 'bitcoin', symbol: 'btc', current_price: 86041, price_change_percentage_24h: 0.91221 },
  { id: 'iexec-rlc', symbol: 'rlc', current_price: 0.573487, price_change_percentage_24h: 58.31297 },
  { id: 'ethereum', symbol: 'eth', current_price: 2715.23, price_change_percentage_24h: -0.49337 },
]
const clean = (text?: string) => (text ?? '').replace(/ | /g, ' ')

describe('crypto-band', () => {
  test('/crypto status : monnaies dans l\'ordre configuré, prix et variation 24 h', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: 0 })
    let url = ''
    on('http.fetch', async (_$, e) => {
      url = e.url
      return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(MARKETS) } }
    })
    const out = await $.command.run({ command: 'crypto', args: 'status' } as never)
    expect(url).toContain('api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=iexec-rlc%2Cethereum%2Cbitcoin')
    expect(clean(out.text)).toBe('RLC 0,5735 $ ▲ +58,31 %  ·  ETH 2 715,23 $ ▼ -0,49 %  ·  BTC 86 041 $ ▲ +0,91 %')
  })

  test('/crypto off désactive et le mémorise', async ($, on) => {
    const saved: Record<string, unknown> = {}
    on('store.set', async (_$, e) => {
      saved[e.key] = e.value
      return { value: undefined }
    })
    mock.clock(on, { now: 0 })
    const out = await $.command.run({ command: 'crypto', args: 'off' } as never)
    expect(out.text).toContain('désactivé')
    expect(saved.enabled).toBe(false)
  })

  test('limite d\'appels CoinGecko (429) : message clair', async ($, on) => {
    mock.store(on)
    mock.clock(on, { now: 0 })
    on('http.fetch', async () => ({ value: { status: 429, ok: false, headers: {}, text: '' } }))
    const out = await $.command.run({ command: 'crypto', args: '' } as never)
    expect(out.text).toBe('cours indisponibles (limite de CoinGecko atteinte, réessai au prochain rafraîchissement)')
  })
})
