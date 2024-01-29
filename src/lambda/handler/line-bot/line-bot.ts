import { APIGatewayProxyResult, APIGatewayProxyEvent, Context } from "aws-lambda";
import { ID_LINE_BOT_USE_CASE, ID_LINE_SIGNATURE_NAME, initContainer } from "../../di-container/register-container";
import { LineBotUseCase, InvalidSignatureError, InvalidRequestError, UnexpectedError } from "../../use-case/line-bot-use-case/use-case";

// レスポンス結果を設定
const resultOK: APIGatewayProxyResult = {
  statusCode: 200,
  body: JSON.stringify({}),
};
const resultSigError: APIGatewayProxyResult = {
  statusCode: 403,
  body: JSON.stringify({}),
};
const resultReqError: APIGatewayProxyResult = {
  statusCode: 401,
  body: JSON.stringify({}),
}
const resultError: APIGatewayProxyResult = {
  statusCode: 500,
  body: JSON.stringify({}),
};

/**
 * Lambda ハンドラ
 * @param eventLambda : Lambda ハンドライベントデータ
 * @param _contextLambda : Lambda ハンドラコンテキストデータ
 * @param callback : コールバック
 * @returns APIGatewayProxyResult : レスポンス
 */
export const handler = async (
  eventLambda: APIGatewayProxyEvent,
  contextLambda: Context,
): Promise<APIGatewayProxyResult> => {
  console.log(JSON.stringify(eventLambda))
  console.log(JSON.stringify(contextLambda));

  // コンテナ初期化
  const container = initContainer();

  // コンテナ取得
  const execLineBotUseCase = await container.getAsync<LineBotUseCase>(ID_LINE_BOT_USE_CASE);
  const stringSignature = container.get<string>(ID_LINE_SIGNATURE_NAME);
  const resultUseCase = await execLineBotUseCase(eventLambda.body!, eventLambda.headers[stringSignature]);

  // エラー内容により出力結果を変える
  if (resultUseCase instanceof InvalidSignatureError) {
    console.error("署名エラーが発生");
    return resultSigError;
  }
  if (resultUseCase instanceof InvalidRequestError) {
    console.error("リクエストエラーが発生");
    return resultReqError;
  }
  if (resultUseCase instanceof UnexpectedError) {
    console.error("予期しないエラーが発生");
    return resultError;
  }
  return resultOK;
}