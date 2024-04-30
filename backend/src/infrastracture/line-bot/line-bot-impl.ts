import { messagingApi, validateSignature } from "@line/bot-sdk";
import { LineBot, LineLoadingAnimationParameter, LineReplyMessageParameter, LineReplyMessageResult } from "../../domain/support/line-bot/line-bot";

interface LineParameterOptions {
  accessToken: string;
  channelSecret: string;
}

/**
 * Line-Bot 実行インプリメント
 */
export class LineBotImpl implements LineBot {
  private readonly options: LineParameterOptions;
  private readonly apiClient: messagingApi.MessagingApiClient;
  /* MessagingApiBlobClient を使用するときは有効にすること
  private readonly apiClientBlob: messagingApi.MessagingApiBlobClient;
  */

  constructor(lineApiParameterOptions: LineParameterOptions) {
    this.options = lineApiParameterOptions;
    this.apiClient = new messagingApi.MessagingApiClient({ channelAccessToken: this.options.accessToken });
    /* MessagingApiBlobClient を使用するときは有効にすること
    this.apiClientBlob = new messagingApi.MessagingApiBlobClient({ channelAccessToken: this.options.accessToken });
    */
  }

  /**
   * LINE ヘッダバリデーションラッパー
   * @param lineApiParameter 判定用に使うチャネルシークレット
   * @param param APIGatewayProxyEvent クラス
   * @returns line-bot.validateSignature 戻り値
   */
  checkSignature(body: string, signature: string): boolean {
    return validateSignature(
      body,
      this.options.channelSecret,
      signature,
    );
  }

  /**
   * ローディングアニメーションの表示
   * @param loadingParameter
   *        chatId : 送り先 LINE ユーザ ID
   *        loadingSeconds : 最大表示時間（単位：秒）（設定可能秒数：5 〜 60 の 5 秒間隔 ※2024/04/28 現在）
   * @returns void
   */
  async showLoadingAnimation(loadingParameter: LineLoadingAnimationParameter): Promise<void> {
    const retValue = await this.apiClient.showLoadingAnimation({
      chatId: loadingParameter.chatId,
      loadingSeconds: loadingParameter.loadingSeconds,
    });
    console.log(retValue);
    return undefined;
  }

  /**
   * replyMessage ラッパー
   * @param replyMessage 返信メッセージ
   * @returns void
   */
  async replyMessage(replyMessage: LineReplyMessageParameter): Promise<LineReplyMessageResult> {
    await this.apiClient.replyMessage({
      replyToken: replyMessage.replyToken,
      messages: replyMessage.messages,
    });
    return undefined
  }
}