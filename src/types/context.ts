export interface Context {
  name: string
  args: string[]
  text: string
  sender: {
    jid: string
    isOwner: boolean
  }
  chat: {
    jid: string
    isGroup: boolean
  }
  reply: {
    text(text: string): Promise<unknown>
  }
}
