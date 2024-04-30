import { messagingApi } from "@line/bot-sdk";

export type LineLoadingAnimationResult = void;
export type LineLoadingAnimationParameter = {
  chatId: string;
  loadingSeconds: number;
}
export type LineReplyMessageResult = void;
export type LineReplyMessageParameter = {
  replyToken: string;
  messages: messagingApi.Message[];
}
export interface LineBot {
  checkSignature(body: string, signature: string): boolean;
  showLoadingAnimation(loadingParameter: LineLoadingAnimationParameter): Promise<LineLoadingAnimationResult>;
  replyMessage(replyMessage: LineReplyMessageParameter): Promise<LineReplyMessageResult>;
}