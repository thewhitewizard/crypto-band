export type Coin = { symbol: string; price: number; change24h: number }
export type Summary = { coins: Coin[]; currency: string; error: string | null }

declare module 'claude-code' {
  interface PluginState {
    'crypto-band': { summary: Summary | null; isEnabled: boolean; isHidden: boolean }
  }
}
