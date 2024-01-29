import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { ImageCraftRepository, CreateImageProc } from "../../domain/model/imageCraft/imageCraft-repository";

export class ImageCraftRepositoryImpl implements ImageCraftRepository {
  private readonly bedrockClient: BedrockRuntimeClient;
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly paramCfgScale: number;
  private readonly paramSeed: number;
  private readonly paramSteps: number;

  constructor({
    bedrock,
    s3,
    bucketName,
  }: {
    bedrock: BedrockRuntimeClient,
    s3: S3Client,
    bucketName: string
  }) {
    this.bedrockClient = bedrock;
    this.s3Client = s3;
    this.bucketName = bucketName;
    this.paramCfgScale = Number(process.env.BEDROCK_PARAM_CFG_SCALE) || 10;
    this.paramSeed = Number(process.env.BEDROCK_PARAM_SEED) || 0;
    this.paramSteps = Number(process.env.BEDROCK_PARAM_STEPS) || 50;
    console.log("ImageCraftRepositoryImpl constructor called.");
    console.log("this : ", this);
  }

  /**
   * 画像取得
   * @param orderedText 生成AIへ要求するテキスト 
   * @returns 生成画像の base64 エンコードテキスト
   */
  private async getAutoImage(orderedText: string): Promise<string> {
    const invokeBedrock = new InvokeModelCommand({
      modelId: "stability.stable-diffusion-xl-v0",
      body: JSON.stringify({
        text_prompts: [{ text: orderedText }],
        cfg_scale: this.paramCfgScale,
        seed: this.paramSeed,
        steps: this.paramSteps,
      }),
      accept: "application/json",
      contentType: "application/json",
    });
    console.log(invokeBedrock);
    const responseBedrock = await this.bedrockClient.send(invokeBedrock);
    const jsonBedrock = JSON.parse(Buffer.from(responseBedrock.body).toString("utf-8"));
    return jsonBedrock.artifacts[0].base64;
  }

  /**
   * 画像を S3 へ保存する
   * @param imagePlaneText 画像のプレーンテキスト
   * @param quoteToken LINE の quoteToken（ファイル名に使用する）
   */
  private async saveImageToS3(imagePlaneText: string, quoteToken: string): Promise<void> {
    const rawData = Buffer.from(imagePlaneText, "base64");
    const inputCommand = {
      /*ACL: "public-read",*/
      Body: rawData,
      Bucket: this.bucketName,
      Key: `${quoteToken}.png`,
      ContentType: "image/png",
    };
    const commandS3 = new PutObjectCommand(inputCommand);
    await this.s3Client.send(commandS3);
  }

  /**
   * 生成 AI に画像生成を要求して S3 に格納
   * @param parameter 生成要求パラメータ
   */
  async createImage(parameter: CreateImageProc): Promise<void> {
    try {
      const planeTextImage = await this.getAutoImage(parameter.orderedText);
      await this.saveImageToS3(planeTextImage, parameter.quoteToken);
    } catch (e) {
      console.error(e);
    }
  }

  /**
   * 生成された画像の URL を取得
   * @param quoteToken ファイル名のキーになる quoteToken
   * @returns URL 文字列
   */
  async getImageUrl(quoteToken: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: `${quoteToken}.png`,
    })
    return getSignedUrl(this.s3Client, command);
  }
}