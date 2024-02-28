import { WebhookRequestBody, WebhookEvent } from "@line/bot-sdk";
import { FollowEvent } from "@line/bot-sdk/dist/webhook/api";
import { LineBot } from "../../domain/support/line-bot/line-bot";
import { MemoStoreRepository } from "../../domain/model/memoStore/memoStore-repository";
import { ImageCraftRepository } from "../../domain/model/imageCraft/imageCraft-repository";
import { execRegisterCommand, execListCommand, execDeleteCommand, execAskCommand, ReplyMessages } from "./dispatchCommand";

export class InvalidSignatureError extends Error {}
export class InvalidRequestError extends Error {}
export class UnexpectedError extends Error {}
export type LineBotUseCaseResult = 
  | void
  | InvalidSignatureError
  | InvalidRequestError
  | UnexpectedError;
export type ExecWebhookEventResult =
  | void
  | UnexpectedError;

/**
 * event ディスパッチ処理
 * @param webhookEvent : event インスタンス
 * @param lineBotClient : LINE の Messaging API 等実行インスタンス
 * @param memoStoreRepository : memoStore データリポジトリ
 * @param imageCraftRepository : imageCraft データリポジトリ
 * @returns ExecWebhookEventResult 戻り値（エラーインスタンス、エラー無しの場合は undefined）
 */
const dispatchEvent = async({
  webhookEvent,
  lineBotClient,
  memoStoreRepository,
  imageCraftRepository,
}: {
  webhookEvent: WebhookEvent,
  lineBotClient: LineBot,
  memoStoreRepository: MemoStoreRepository,
  imageCraftRepository: ImageCraftRepository,
}): Promise<ExecWebhookEventResult> => {
  console.log("LINE Bot use case start.", webhookEvent);

  try {
    const commandResult: ReplyMessages = [];
    if (webhookEvent.type === "follow") {
      const followEvent: FollowEvent = (webhookEvent as FollowEvent);
      if (followEvent.follow !== null) {
        if (followEvent.follow.isUnblocked === true) {
          commandResult.push({
            type: "text",
            text: "おかえりなさいませ！",
          });
        } else {
          commandResult.push({
            type: "text",
            text: "いらっしゃいませ！",
          });
        }
      }
    } else if (webhookEvent.type === "message" && webhookEvent.message.type === "text") {
      const requestText: string = webhookEvent.message.text;
      const lineUserId: string = webhookEvent.source.userId || "";
      const quoteToken = webhookEvent.message.quoteToken;
      if (requestText.startsWith("regist:")) {
        // データ登録機能
        const resultRegisterCommand = await execRegisterCommand({
          memoStoreRepository,
          lineUserId,
          memoText: requestText.replace("regist:", ""),
          quoteToken,
        });
        console.log("result : ", resultRegisterCommand);
        resultRegisterCommand.map((item) => commandResult.push(item));
      } else if (requestText.startsWith("list")) {
        // データ一覧表示機能
        const resultListCommand = await execListCommand({
          memoStoreRepository,
          lineUserId,
          quoteToken,
          maxListNumber: Number(process.env.TABLE_MAXIMUM_NUMBER_OF_RECORD) || 5,
        });
        console.log("result : ", resultListCommand);
        resultListCommand.map((item) => commandResult.push(item));
      } else if (requestText.startsWith("delete:")) {
        // データ削除機能
        const resultDeleteCommand = await execDeleteCommand({
          memoStoreRepository,
          lineUserId,
          messageId: Number(requestText.replace("delete:", "")),
          quoteToken,
        });
        console.log("result : ", resultDeleteCommand);
        resultDeleteCommand.map((item) => commandResult.push(item));
      } else if (requestText.startsWith("ask:")) {
        // 生成 AI へ画像生成依頼機能
        const resultAskCommand = await execAskCommand({
          imageCraftRepository,
          orderedText: requestText.replace("ask:", ""),
          quoteToken,
        });
        console.log("result : ", resultAskCommand);
        resultAskCommand.map((item) => commandResult.push(item));
      } else {
        // オウム返し
        commandResult.push({
          type: "text",
          text: webhookEvent.message.text,
          quoteToken: quoteToken,
        });
        // クリップボードアクションを使ったテンプレートを送信
        commandResult.push({
          type: "template",
          altText: "文字をオウム返しします",
          template: {
            type: "buttons",
            title: "オウム返しボットテスト",
            text: "オウム返しテキストをクリップボードへコピーします",
            actions: [{
              type: "clipboard",
              label: "コピー",
              clipboardText: webhookEvent.message.text,
            },],
          }
        });
      }
    } else {
      console.error("メッセージが受け付けられない形式");
      return new UnexpectedError();
    }
    console.log("commandResult : ", commandResult);
    // LINE リプライ実行
    await lineBotClient.replyMessage({
      replyToken: webhookEvent.replyToken,
      messages: commandResult,
    });
  } catch (e) {
    console.error(e);
    return new UnexpectedError();
  }
  return undefined;
}

export type LineBotUseCase = (
  stringBody?: string,
  stringSignature?: string,
) => Promise<LineBotUseCaseResult>;
/**
 * LINE ボットのユースケース実行処理
 * @param lineBotClient : LINE の Messaging API 等実行インスタンス
 * @param validateSignature : 署名検証用関数
 * @param memoStoreRepository : memoStore データリポジトリ
 * @param imageCraftRepository : imageCraft データリポジトリ
 * @returns LineBotUseCase 戻り値（エラーインスタンス、エラー無しの場合は undefined）
 */
export const execLineBotUseCase = ({
  lineBotClient,
  memoStoreRepository,
  imageCraftRepository,
}: {
  lineBotClient: LineBot,
  memoStoreRepository: MemoStoreRepository,
  imageCraftRepository: ImageCraftRepository,
}): LineBotUseCase => 
async (stringBody?: string, stringSignature?: string): Promise<LineBotUseCaseResult> => {
  if (stringBody == null) {
    return new InvalidRequestError();
  }
  if (stringSignature == null) {
    return new InvalidRequestError();
  }
  // 署名検証
  const validateResult = lineBotClient.checkSignature( stringBody, stringSignature );
  if (!validateResult) {
    return new InvalidSignatureError();
  }
  // body から必要なパラメータを取得
  const bodyRequest: WebhookRequestBody = JSON.parse(stringBody!);
  const { events } = bodyRequest;
  // event 配列ごとにディスパッチを呼ぶ（通常は 1 つしか無い）
  const results = await Promise.allSettled(
    events.map(async (webhookEvent) => {
      await dispatchEvent({
        webhookEvent,
        lineBotClient,
        memoStoreRepository,
        imageCraftRepository,
      });
    })
  );
  console.log("event results : ", results);
  // events 配列ごとに処理した結果を確認
  const errorResults = (results as PromiseFulfilledResult<ExecWebhookEventResult>[])
    .filter((result) => result.value instanceof Error);
  // 一つでもエラーがあればエラー終了
  if (errorResults.length > 0) {
    console.error("処理がエラーになりました", errorResults);
    return new UnexpectedError();
  }
  // エラーがない場合は undefined で終了
  return undefined;
}
