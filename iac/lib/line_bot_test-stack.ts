import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as iam from "aws-cdk-lib/aws-iam";

export class LineBotTestStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // example resource
    // Lambda 関数の作成
    const roleMemoBot = new iam.Role(this, "LineMemoRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
    });
    const lambdaMemoBot = new lambdaNodejs.NodejsFunction(this, "LineMemoBot", {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: "../backend/src/handler/line-bot/line-bot.ts",
      environment: {
        SECRET_ID: "LineAccessInformation",
        TABLE_MAXIMUM_NUMBER_OF_RECORD: "5",
      },
      role: roleMemoBot,
      timeout: cdk.Duration.seconds(120),
    });

    // DynamoDB の作成
    const dynamoMemoBot = new dynamodb.Table(this, "dynamoMemoTable", {
      tableName: "LineMemoBot_memo",
      partitionKey: { name: "lineUserId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "messageId", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
    // 作ったテーブル名を Lambda の環境変数へセット
    lambdaMemoBot.addEnvironment("TABLE_NAME", dynamoMemoBot.tableName);

    // S3 の作成
    const s3MemoBot = new s3.Bucket(this, "s3MemoBucket", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    // 作ったバケットを Lambda の環境変数へセット
    lambdaMemoBot.addEnvironment("BUCKET_NAME", s3MemoBot.bucketName);

    // 権限付与
    // Lambda -> Systems Manager
    const ssmChannelSecret = ssm.StringParameter.fromSecureStringParameterAttributes(this, "ssmChannelSecret", {
      parameterName: "/LineAccessInformation/CHANNEL_SECRET",
    });
    ssmChannelSecret.grantRead(lambdaMemoBot);
    const ssmAccessToken = ssm.StringParameter.fromSecureStringParameterAttributes(this, "ssmAccessToken", {
      parameterName: "/LineAccessInformation/ACCESS_TOKEN",
    });
    ssmAccessToken.grantRead(lambdaMemoBot);

    // Lambda -> DynamoDB
    dynamoMemoBot.grantReadWriteData(lambdaMemoBot);
    // Lambda -> S3
    s3MemoBot.grantPutAcl(lambdaMemoBot);
    s3MemoBot.grantReadWrite(lambdaMemoBot);
    // Lambda -> Bedrock
    const policyBedrock = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["bedrock:InvokeModel"],
      resources: ["*"],
    });
    lambdaMemoBot.addToRolePolicy(policyBedrock);
    const policyCloudWatch = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents",],
      resources: ["*"],
    });
    lambdaMemoBot.addToRolePolicy(policyCloudWatch);
    lambdaMemoBot.addEnvironment("BEDROCK_PARAM_CFG_SCALE", "10");
    lambdaMemoBot.addEnvironment("BEDROCK_PARAM_SEED", "0");
    lambdaMemoBot.addEnvironment("BEDROCK_PARAM_STEPS", "50");

    // API Gateway の作成
    const api = new apigateway.RestApi(this, "LineMemoApi", {
      restApiName: "LineMemoApi",
    });
    // proxy ありで API Gateway に渡すインテグレーションを作成
    const lambdaInteg = new apigateway.LambdaIntegration(lambdaMemoBot, {
      proxy: true,
    });
    // API Gateway の POST イベントと Lambda との紐付け
    api.root.addMethod("POST", lambdaInteg);
  }
}
