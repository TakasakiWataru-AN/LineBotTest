import { messagingApi, validateSignature } from "@line/bot-sdk";
import { LineBot, LineReplyMessageParameter, LineReplyMessageResult } from "../../domain/support/line-bot/line-bot";

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

  constructor(lineApiParameteroptionss: LineParameterOptions) {
    this.options = lineApiParameteroptionss;
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