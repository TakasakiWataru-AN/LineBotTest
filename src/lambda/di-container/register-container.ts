import { Container } from 'inversify'; 
import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { S3Client } from "@aws-sdk/client-s3";
import { LINE_SIGNATURE_HTTP_HEADER_NAME } from '@line/bot-sdk';
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { LineBotImpl } from "../infrastracture/line-bot/line-bot-impl";
import { MemoStoreDynamoDBRepository } from '../infrastracture/repository/memoStore-dynamodb-repository';
import { ImageCraftRepositoryImpl } from '../infrastracture/repository/imageCraft-bedrock-s3-repository';
import { execLineBotUseCase } from '../use-case/line-bot-use-case/use-case';

export const ID_AWS_REGION = "ID_AWS_REGION" as const;
export const ID_TABLE_NAME = "ID_TABLE_NAME" as const;
export const ID_BUCKET_NAME = "ID_BUCKET_NAME" as const;
export const ID_LINE_SIGNATURE_NAME = "ID_LINE_SIGNATURE_NAME" as const;
export const ID_SSM = "ID_SSM" as const;
export const ID_S3 = "ID_S3" as const;
export const ID_DYNAMODB = "ID_DYNAMODB" as const;
export const ID_DYNAMODB_DOCUMENT = "ID_DYNAMODB_DOCUMENT" as const;
export const ID_BEDROCK = "ID_BEDROCK" as const;
export const ID_LINE_BOT = "ID_LINE_BOT" as const;
export const ID_MEMO_STORE_REPOSITORY = "ID_MEMO_STORE_REPOSITORY" as const;
export const ID_IMAGE_CRAFT_REPOSITORY = "ID_IMAGE_CRAFT_REPOSITORY" as const;
export const ID_LINE_BOT_USE_CASE = "ID_LINE_BOT_USE_CASE" as const;

export const initContainer = (): Container => {
  const container = new Container();

  // 環境変数
  container
    .bind(ID_AWS_REGION)
    .toDynamicValue(() => process.env.AWS_REGION || "")
    .inSingletonScope();
  container
    .bind(ID_TABLE_NAME)
    .toDynamicValue(() => process.env.TABLE_NAME || "")
    .inSingletonScope();
  container
    .bind(ID_BUCKET_NAME)
    .toDynamicValue(() => process.env.BUCKET_NAME || "")
    .inSingletonScope();
  container
    .bind(ID_LINE_SIGNATURE_NAME)
    .toDynamicValue(() => LINE_SIGNATURE_HTTP_HEADER_NAME)
    .inSingletonScope();
  // Systems Manager
  container
    .bind(ID_SSM)
    .toDynamicValue((context) => new SSMClient({
      region: context.container.get<string>(ID_AWS_REGION)
    }))
    .inSingletonScope();
  // S3
  container
    .bind(ID_S3)
    .toDynamicValue((context) => new S3Client({
      region: context.container.get<string>(ID_AWS_REGION)
    }))
    .inSingletonScope();
  // DynamoDB
  container
    .bind(ID_DYNAMODB)
    .toDynamicValue((context) => new DynamoDBClient({
      region: context.container.get<string>(ID_AWS_REGION)
    }))
    .inSingletonScope();
  container
    .bind(ID_DYNAMODB_DOCUMENT)
    .toDynamicValue((context) =>
      DynamoDBDocumentClient.from(context.container.get<DynamoDBClient>(ID_DYNAMODB)))
    .inSingletonScope();
  // Bedrock
  container
    .bind(ID_BEDROCK)
    .toDynamicValue(() =>
      new BedrockRuntimeClient({ region: "us-east-1" }))
    .inSingletonScope();
  // LINE Messaging API 実行用
  container
    .bind(ID_LINE_BOT)
    .toDynamicValue(async (context) => {
      const ssmGetChennelSecretCommand = new GetParameterCommand({
        Name: "/LineAccessInformation/CHANNEL_SECRET",
        WithDecryption: true,
      });
      const ssmGetAccessTokenCommand = new GetParameterCommand({
        Name: "/LineAccessInformation/ACCESS_TOKEN",
        WithDecryption: true,
      });
      const clientSsm = context.container.get<SSMClient>(ID_SSM);
      const [channelSecret, accessToken] = await Promise.all([
        clientSsm.send(ssmGetChennelSecretCommand),
        clientSsm.send(ssmGetAccessTokenCommand),
      ]);
      const item = new LineBotImpl({
        accessToken: accessToken.Parameter!.Value || "",
        channelSecret: channelSecret.Parameter!.Value || "",
      });
      return item;
    }) 
    .inSingletonScope();
  // memoStore データリポジトリ
  container
    .bind(ID_MEMO_STORE_REPOSITORY)
    .toDynamicValue((context) => 
      new MemoStoreDynamoDBRepository({
        dbDocument: context.container.get<DynamoDBDocumentClient>(ID_DYNAMODB_DOCUMENT),
        memoStoreTableName: context.container.get<string>(ID_TABLE_NAME),
      })  
    )
    .inSingletonScope();
  // imageCraft データリポジトリ
  container
    .bind(ID_IMAGE_CRAFT_REPOSITORY)
    .toDynamicValue((context) => 
      new ImageCraftRepositoryImpl({
        bedrock: context.container.get<BedrockRuntimeClient>(ID_BEDROCK),
        s3: context.container.get<S3Client>(ID_S3),
        bucketName: context.container.get<string>(ID_BUCKET_NAME),
      })
    )
    .inSingletonScope();
  // LINE ボットユースケース
  container
    .bind(ID_LINE_BOT_USE_CASE)
    .toDynamicValue(async (context) =>
      execLineBotUseCase({
        lineBotClient: await context.container.getAsync<LineBotImpl>(ID_LINE_BOT),
        memoStoreRepository: context.container.get<MemoStoreDynamoDBRepository>(ID_MEMO_STORE_REPOSITORY),
        imageCraftRepository: context.container.get<ImageCraftRepositoryImpl>(ID_IMAGE_CRAFT_REPOSITORY),
      })
    )
    .inSingletonScope();

  return container;
}