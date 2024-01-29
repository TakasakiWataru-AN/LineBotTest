import { Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Function, Runtime, Code } from "aws-cdk-lib/aws-lambda";
import { RestApi, LambdaIntegration } from "aws-cdk-lib/aws-apigateway";
import { Table, AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { StringParameter } from "aws-cdk-lib/aws-ssm";
import { Bucket } from "aws-cdk-lib/aws-s3"
import { PolicyStatement, Role, Effect, ServicePrincipal } from "aws-cdk-lib/aws-iam";

export class LineBotTestStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // example resource
    // Lambda 関数の作成
    const roleMemoBot = new Role(this, "LineMemoRole", {
      assumedBy: new ServicePrincipal("lambda.amazonaws.com"),
    });
    const lambdaMemoBot = new Function(this, "LineMemoBot", {
      runtime: Runtime.NODEJS_18_X,
      handler: "handler/line-bot/line-bot.handler",
      code: Code.fromAsset("src/lambda"),
      environment: {
        SECRET_ID: "LineAccessInformation",
        TABLE_MAXIMUM_NUMBER_OF_RECORD: "5",
      },
      role: roleMemoBot,
      timeout: Duration.seconds(120),
    });

    // DynamoDB の作成
    const dynamoMemoBot = new Table(this, "dynamoMemoTable", {
      tableName: "LineMemoBot_memo",
      partitionKey: { name: "lineUserId", type: AttributeType.STRING },
      sortKey: { name: "messageId", type: AttributeType.NUMBER },
    });
    // 作ったテーブル名を Lambda の環境変数へセット
    lambdaMemoBot.addEnvironment("TABLE_NAME", dynamoMemoBot.tableName);

    // S3 の作成
    const s3MemoBot = new Bucket(this, "s3MemoBucket", {
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    // 作ったバケットを Lambda の環境変数へセット
    lambdaMemoBot.addEnvironment("BUCKET_NAME", s3MemoBot.bucketName);

    // 権限付与
    // Lambda -> Systems Manager
    const ssmChannelSecret = StringParameter.fromSecureStringParameterAttributes(this, "ssmChannelSecret", {
      parameterName: "/LineAccessInformation/CHANNEL_SECRET",
    });
    ssmChannelSecret.grantRead(lambdaMemoBot);
    const ssmAccessToken = StringParameter.fromSecureStringParameterAttributes(this, "ssmAccessToken", {
      parameterName: "/LineAccessInformation/ACCESS_TOKEN",
    });
    ssmAccessToken.grantRead(lambdaMemoBot);

    // Lambda -> DynamoDB
    dynamoMemoBot.grantReadWriteData(lambdaMemoBot);
    // Lambda -> S3
    s3MemoBot.grantPutAcl(lambdaMemoBot);
    s3MemoBot.grantReadWrite(lambdaMemoBot);
    // Lambda -> Bedrock
    const policyBedrock = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["bedrock:InvokeModel"],
      resources: ["*"],
    });
    lambdaMemoBot.addToRolePolicy(policyBedrock);
    const policyCloudWatch = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents",],
      resources: ["*"],
    });
    lambdaMemoBot.addToRolePolicy(policyCloudWatch);
    lambdaMemoBot.addEnvironment("BEDROCK_PARAM_CFG_SCALE", "10");
    lambdaMemoBot.addEnvironment("BEDROCK_PARAM_SEED", "0");
    lambdaMemoBot.addEnvironment("BEDROCK_PARAM_STEPS", "50");

    // API Gateway の作成
    const api = new RestApi(this, "LineMemoApi", {
      restApiName: "LineMemoApi",
    });
    // proxy ありで API Gateway に渡すインテグレーションを作成
    const lambdaInteg = new LambdaIntegration(lambdaMemoBot, {
      proxy: true,
    });
    // API Gateway の POST イベントと Lambda との紐付け
    api.root.addMethod("POST", lambdaInteg);
  }
}
