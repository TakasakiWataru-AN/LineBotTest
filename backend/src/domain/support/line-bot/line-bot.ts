import { messagingApi } from "@line/bot-sdk";

export type LineReplyMessageResult = void;
export type LineReplyMessageParameter = {
  replyToken: string;
  messages: messagingApi.Message[];
}
export interface LineBot {
  checkSignature(body: string, signature: string): boolean;
  replyMessage(replyMessage: LineReplyMessageParameter): Promise<LineReplyMessageResult>;
}