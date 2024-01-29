import { MemoStore, MemoStores } from "./memoStore";

export type MemoStoreResult = MemoStore;
export type MemoStoresResult = MemoStores;
export interface DeleteItemProc {
  lineUserId: string;
  messageId: number;
}

export interface MemoStoreRepository {
  getAll(): Promise<MemoStoresResult>;
  getMemosFromLineId(lineUserId: string): Promise<MemoStoresResult>;
  putItem(item: MemoStore): Promise<void>;
  deleteItem(item: DeleteItemProc): Promise<void>;
}