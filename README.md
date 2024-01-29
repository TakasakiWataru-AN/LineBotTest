# LineBotTest

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

## 注意点

ブログ記事からのソースをご参照いただく環境ですので本リポジトリには Issue は設けておりません。
予めご了承ください。

また、本環境をお使いのときは自己責任でお使いください。

## 今後の改善内容

本リポジトリはサンプルですが、今後改善予定としているものは以下の通りです。  
※更新内容はブログ化するかもしれません。

- IaC ソースのリファクタリング
- tsconfig.json の整備
- ルートと src/lambda にある２つの package.json の一体化
- テストの実装

## 初期コマンド

clone 直後に以下のコマンドを入力してください。

```
npm ci
cd src/lambda
npm ci
cd ../..
npm run build
※AWS への Role を付与しておく
cdk synth
cdk bootstrap
cdk deploy
```

実行には以下のパラメータを Systems Manager のパラメータストアに「SecureString」で設定しておいてください。

- /LineAccessInformation/ACCESS_TOKEN：公式アカウントのアクセストークン
- /LineAccessInformation/CHANNEL_SECRET：公式アカウントのチャンネルシークレット

`cdk deploy`を行った後、Outputs で表示されるエンドポイント URL を LINE 公式アカウントの Messaging API の Webhook URL へ設定してください。

↓下記みたいな表示
```
$ cdk deploy

✨  Synthesis time: 2.81s

LineBotTestStack: building assets...
中略
Outputs:
LineBotTestStack.LineMemoApiEndpointXXXXXXXX = https://xxxxxxxxxx.execute-api.yy-yyyyyyyyy-1.amazonaws.com/prod/
Stack ARN:
arn:aws:cloudformation:...

✨  Total time: 35.47s

%
```

## 2回目以降について

一度デプロイしてからは TypeScript のソースを変更後、以下のコマンドでデプロイ出来ます。

```
npm run build
※AWS への Role を付与しておく
cdk deploy
```

## 各セットアップ内容

`cdk init`した後、各 SDK を適用した内容を記載しておきます。

### src/lambda のパッケージ作成と Lambda SDK の適用

```
cd src/lambda
npm init
※聞かれた項目はそのまま Enter を押す。
npm i @types/aws-lambda
```

### LINE Bot 使用

```
cd src/lambda
npm i @line/bot-sdk
```

### dynamodb 使用

```
cd src/lambda
npm i @aws-sdk/lib-dynamodb
```

### Bedrock 使用（ついでに S3）

```
cd src/lambda
npm i @aws-sdk/client-bedrock-runtime
npm i @aws-sdk/cliens-s3
npm i @aws-sdk/s3-request-presigner
```

### ライブラリアップデート

- npm-check-updates をインストール
  - `npm install npm-check-updates`
- 以下を各々の package.json に設定する
  - "scripts" に "update:pkgs"（一例）を設け`ncu -u`をコマンドとして指定する

ルートと src/lambda ディレクトリでそれぞれ`npm run update:pkgs`を入力するとアップデートを実行してくれる

## データベース構成

| 項目       | 説明                   | キー | 型     | 備考 |
| :--------- | :--------------------- | :--- | :----- | :--- |
| lineuserid | 要求元 LINE UserID     | PK   | string |      |
| messageId  | 通し番号               | SK   | number |      |
| memoText   | メモ本文               |      | string |      |
| storedTime | メモ記録時間           |      | number |      |
| quoteToken | 記録時の LINE トークン |      | string |      |

## コマンドインターフェース

| コマンド | 説明     | フォーマット                           | 応答                                                             |
| :------- | :------- | :------------------------------------- | :--------------------------------------------------------------- |
| list     | 一覧表示 | list 以降は何の文字が入っても良い      | 成功時「通し番号 : メモ」を連続出力<br />※最新の5個を取得<br />失敗時 エラーレスポンス |
| regist   | メモ登録 | regist: 以降の文字をメモとして登録する | 成功時「〜 の内容を登録しました」<br />失敗時 エラーレスポンス   |
| delete   | 削除     | delete:通し番号 で指定                 | 成功時「番号 の削除が完了しました」<br />失敗時 エラーレスポンス<br />※番号のデータがなくてもエラーにはならない |
| ask      | 画像生成 | ask:依頼コマンド で指定                | 成功時 画像メッセージを生成して送信<br />失敗時 エラーレスポンス |

## ファイル構成

ファイル構成は以下のようになっています。

```
/
┣ bin
┃ ┗ line_bot_test.ts
┣ lib
┃ ┗ line_bot_test-stack.ts
┣ src
┃ ┗ lambda
┃   ┣ di-container
┃   ┃ ┗ register-container.ts
┃   ┣ domain
┃   ┃ ┣ model
┃   ┃ ┃ ┣ imageCraft
┃   ┃ ┃ ┃ ┣ imageCraft.ts
┃   ┃ ┃ ┃ ┗ imageCragt-repository.ts
┃   ┃ ┃ ┗ memoStore
┃   ┃ ┃   ┣ memoStore.ts
┃   ┃ ┃   ┗ memoStore-repository.ts
┃   ┃ ┗ support
┃   ┃   ┗ line-bot
┃   ┃     ┗ line-bot.ts
┃   ┣ handler
┃   ┃  ┗ line-bot
┃   ┃    ┗ line-bot-handler.ts
┃   ┣ infrastracture
┃   ┃ ┣ line-bot
┃   ┃ ┃ ┗ line-bot-impl.ts
┃   ┃ ┗ repository
┃   ┃   ┣ imageCraft-bedrock-s3-repository.ts
┃   ┃   ┗ memoStore-dynamodb-repository.ts
┃   ┣ use-case
┃   ┃    ┗ use-case.ts
┃   ┣ package-lock.json
┃   ┗ package.json
┣ test
┃ ┗ line_bot_test.test.ts
┣ .eslintignore
┣ .gitignore
┣ .npmignore
┣ cdk.json
┣ jest.config.js
┣ LICENSE
┣ package-lock.json
┣ package.json
┣ README.md
┗ tsconfig.json
```
