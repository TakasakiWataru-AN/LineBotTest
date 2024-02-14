import { messagingApi } from "@line/bot-sdk";
import { MemoStoreRepository } from "../../domain/model/memoStore/memoStore-repository";
import { ImageCraftRepository } from "../../domain/model/imageCraft/imageCraft-repository";

export type ReplyMessages = Array<messagingApi.Message>;

/**
 * register コマンド実行処理
 * @param memoStoreRepository : memoStore データリポジトリ
 * @param lineUserId : キーとなる LineUserID
 * @param memoText : 更新したいメモ
 * @param quoteToken : LINE のユニークトークン
 * @returns replyMessage 形式
 */
export const execRegisterCommand = async ({
  memoStoreRepository,
  lineUserId,
  memoText,
  quoteToken,
}: {
  memoStoreRepository: MemoStoreRepository,
  lineUserId: string,
  memoText: string,
  quoteToken: string,
}): Promise<ReplyMessages> => {
  const reply: ReplyMessages = [];
  try {
    // putItem 実行（messageId は putItem 内で発行）
    await memoStoreRepository.putItem({
      lineUserId,
      messageId: 0,
      memoText,
      storedTime: new Date().getTime().toString(),
    });
    // 応答メッセージを作成
    reply.push({
      type: "text",
      text: memoText + " の登録が完了しました",
      quoteToken: quoteToken,
    });
  } catch (e) {
    // コンソールにエラーを出す
    console.error(e);
    // 応答メッセージを作成
    reply.push({
      type: "text",
      text: (e instanceof Error) ? e.message : "登録時にエラーが発生しました",
      quoteToken: quoteToken,
    });
  }
  return reply;
}

/**
 * list コマンド実行
 * @param memoStoreRepository : memoStore データリポジトリ
 * @param lineUserId : キーとなる LineUserID
 * @param quoteToken ： LINE のユニークトークン
 * @param maxListNumber : 最大取得件数 
 * @returns replyMessage 形式
 */
export const execListCommand = async ({
  memoStoreRepository,
  lineUserId,
  quoteToken,
  maxListNumber,
}: {
  memoStoreRepository: MemoStoreRepository,
  lineUserId: string,
  quoteToken: string,
  maxListNumber: number,
}): Promise<ReplyMessages> => {
  console.log("execListCommand start.");
  const reply: ReplyMessages = [];
  try {
    // 一覧取得
    const items = await memoStoreRepository.getMemosFromLineId(lineUserId);
    console.log("items :", items);
    // 最大取得件数に絞る
    items.some((item, index) => {
      // 応答メッセージを作成
      reply.push({
        type: "text",
        text: item.memoText,
        quoteToken: (index === 0) ? quoteToken : "",
      });
      if (reply.length === maxListNumber) {
        return true;
      }
      return false;
    });
    if (reply.length === 0) {
      reply.push({
        type: "text",
        text: "データが存在しません",
        quoteToken: quoteToken,
      });
    }
  } catch (e) {
    // コンソールにエラーを出す
    console.error(e);
    // 応答メッセージを作成
    reply.push({
      type: "text",
      text: (e instanceof Error) ? e.message : "一覧取得時にエラーが発生しました",
      quoteToken: quoteToken,
    });
  }
  console.log("reply : ", reply);
  return reply;
}

/**
 * delete コマンド実行
 * @param memoStoreRepository : memoStore データリポジトリ 
 * @param lineUserId : キーとなる LineUserID
 * @param messageId : キーとなる messageID
 * @param quoteToken ： LINE のユニークトークン
 * @returns replyMessage 形式
 */
export const execDeleteCommand = async({
  memoStoreRepository,
  lineUserId,
  messageId,
  quoteToken,
}: {
  memoStoreRepository: MemoStoreRepository,
  lineUserId: string,
  messageId: number,
  quoteToken: string,
}): Promise<ReplyMessages> => {
  const reply: ReplyMessages = [];
  try {
    // deleteItem 実行
    await memoStoreRepository.deleteItem({
      lineUserId,
      messageId,
    });
    // 応答メッセージを作成
    reply.push({
      type: "text",
      text: messageId + " の削除処理が完了しました",
      quoteToken: quoteToken,
    });
  } catch (e) {
    // コンソールにエラーを出す
    console.error(e);
    // 応答メッセージを作成
    reply.push({
      type: "text",
      text: (e instanceof Error) ? e.message : "削除時にエラーが発生しました",
      quoteToken: quoteToken,
    });
  }
  return reply;
}

/**
 * ask コマンド実行
 * @param imageCraftRepository : ImageCraft データリポジトリ
 * @param orderedText : 生成要求テキスト
 * @param quoteToken ： LINE のユニークトークン
 * @returns replyMessage 形式
 */
export const execAskCommand = async({
  imageCraftRepository,
  orderedText,
  quoteToken,
}: {
  imageCraftRepository: ImageCraftRepository,
  orderedText: string,
  quoteToken: string,
}): Promise<ReplyMessages> => {
  const reply: ReplyMessages = [];
  try {
    // 画像生成要求
    await imageCraftRepository.createImage({ orderedText, quoteToken });
    // 画像 URL 取得（戻り値に使用するため）
    const imageUrl = await imageCraftRepository.getImageUrl(quoteToken);
    // 応答メッセージを作成
    reply.push({
      type: "image",
      originalContentUrl: imageUrl,
      previewImageUrl: imageUrl,
    });
  } catch (e) {
	// コンソールにエラーを出す
    console.error(e);
    // 応答メッセージを作成
    reply.push({
      type: "text",
      text: (e instanceof Error) ? e.message : "画像生成時にエラーが発生しました",
      quoteToken: quoteToken,
    });
  }
  return reply;
}
