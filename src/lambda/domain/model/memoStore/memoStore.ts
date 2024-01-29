export interface MemoStore {
  lineUserId: string
  messageId: number
  memoText: string
  storedTime: string
}

export type MemoStores = ReadonlyArray<MemoStore>;
