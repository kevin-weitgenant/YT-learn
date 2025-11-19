export interface Message {
  id: number
  text: string
  sender: "user" | "bot"
}

export interface TokenInfo {
  systemTokens: number // System message tokens
  conversationTokens: number // User + assistant tokens
  totalTokens: number // System + conversation
  inputQuota: number // Total token quota
  percentageUsed: number // 0-100%
}
