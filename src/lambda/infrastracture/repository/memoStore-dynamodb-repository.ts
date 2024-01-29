import {
  DynamoDBDocumentClient,
  ScanCommand,
  QueryCommand,
  PutCommand,
  DeleteCommand
} from "@aws-sdk/lib-dynamodb";
import { MemoStore } from "../../domain/model/memoStore/memoStore";
import {
  DeleteItemProc,
  MemoStoresResult,
  MemoStoreRepository
} from "../../domain/model/memoStore/memoStore-repository";

export class MemoStoreDynamoDBRepository implements MemoStoreRepository {
  private readonly dbDocument: DynamoDBDocumentClient;
  private readonly memoStoreTableName: string;

  constructor({
    dbDocument,
    memoStoreTableName,
  }: {
    dbDocument: DynamoDBDocumentClient,
    memoStoreTableName: string,
  }) {
    this.dbDocument = dbDocument;
    this.memoStoreTableName = memoStoreTableName;
  }

  /**
   * 全件取得（プライマリキー関係なく全件取得する）
   * @returns MemoStore 全件
   */
  async getAll(): Promise<MemoStoresResult> {
    const command = new ScanCommand({
      TableName: this.memoStoreTableName,
    })
    const { Items: items = [] } = await this.dbDocument.send(command);
    if (items.length === 0) {
      return [];
    }
    const scanedItems: MemoStore[] = [];
    // 取れた分だけ MemoStore 配列に展開
    items.map((item) => {
      const element: MemoStore = {
        lineUserId: item["lineUserId"] || "",
        messageId: Number(item["messageId"] || "0"),
        memoText: item["memoText"] || "",
        storedTime: item["storedTime"] || "",
      }
      scanedItems.push(element);
    })
    return scanedItems;
  }

  /**
   * lineUserId に関係するデータ全件取得
   * @param lineUserId キーとなる lineUserId
   * @returns lineUserId に該当する MemoStore 全件
   */
  async getMemosFromLineId(lineUserId: string): Promise<MemoStoresResult> {
    const command = new QueryCommand({
      TableName: this.memoStoreTableName,
      KeyConditionExpression: "lineUserId = :userid",
      ExpressionAttributeValues: { ":userid": lineUserId },
      ScanIndexForward: false,
    })
    const { Items: items = [] } = await this.dbDocument.send(command);
    if (items.length === 0) {
      return [];
    }
    const queryItems: MemoStore[] = [];
    // 取れた分だけ MemoStore 配列に展開
    items.map((item) => {
      const element: MemoStore = {
        lineUserId: item["lineUserId"] || "",
        messageId: Number(item["messageId"] || "0"),
        memoText: item["memoText"] || "",
        storedTime: item["storedTime"] || "",
      }
      queryItems.push(element);
    })
    return queryItems;
  }

  /**
   * lineUserId に該当する messageId の最終番号を取得する
   * @param lineUserId キーとなる lineUserId
   * @returns messageId の最終番号（無い場合は0、エラー時は-1）
   */
  private async getLastCount(lineUserId: string): Promise<number> {
    // 逆順で１つだけ取得
    const command = new QueryCommand({
      TableName: this.memoStoreTableName,
      KeyConditionExpression: "lineUserId = :userid",
      ExpressionAttributeValues: { ":userid": lineUserId },
      ScanIndexForward: false,
      Limit: 1,
    });
    try {
      const { Items: items = [] } = await this.dbDocument.send(command);
      if (items !== undefined) {
        // 一つもなかった場合は Items が空配列なのでゼロを返す
        if (items.length === 0) {
          return 0;
        }
        // messageId が undefined の場合は -1 で終了
        if (items[0]["messageId"] === undefined) {
          console.error("getLastCount : messageId undefined.");
          return -1;
        }
        return Number(items[0]["messageId"]);
      }
      console.error("getLastCount : items undefined.");
      return -1;
    } catch (error) {
      console.error("getLastCount : ", error);
    }
    return -1;
  }

  /**
   * データ１件追加
   * @param item 追加したいデータ
   */
  async putItem(item: MemoStore): Promise<void> {
    const numLastId: number = await this.getLastCount(item.lineUserId);
    try {
      if (numLastId === -1) {
        // 失敗したら登録せず throw して終了
        throw new Error("最大値取得に失敗");
      }
      const command = new PutCommand({
        TableName: this.memoStoreTableName,
        Item: {
          lineUserId: item.lineUserId,
          messageId: numLastId + 1,
          storedTime: item.storedTime,
          memoText: item.memoText,
        },
      });
      await this.dbDocument.send(command);
    } catch (error) {
      console.error("putItem :", error);
    }
  }

  /**
   * データ１件削除
   * @param item lineUserId、messageId パラメータ（この２つでユニークになる）
   */
  async deleteItem(item: DeleteItemProc): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.memoStoreTableName,
      Key: {
        lineUserId: item.lineUserId,
        messageId: Number(item.messageId),
      },
    });
    try {
      await this.dbDocument.send(command);
    } catch (error) {
      console.error("deleteItem :", error);
    }
  }
}