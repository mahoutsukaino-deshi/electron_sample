# はじめに

Electron の勉強のため簡単なアプリケーションを作ってみました。
こんな感じの画面になります。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/1106967/fffd3aa9-160f-32d6-50c5-fcfad888ba31.png)

機能的には次のようになります。

1. 郵便番号を入力して住所を検索する。
   住所の検索には Web API を使用しています。
2. 検索結果を画面に表示する。
   グリッド形式で表示してみました。
3. 住所の検索結果をファイルに保存する。
   保存するときにはダイアログを表示してファイル名を指定できるようにしています。

# 開発

## 住所を検索する Web API

郵便番号から住所を検索する API は下記を使用しました。

http://zipcloud.ibsnet.co.jp/doc/api

curl コマンドで実行してみると、以下のような JSON 形式で住所情報が返ってきます。

```sh
$ curl -i "https://zipcloud.ibsnet.co.jp/api/search?zipcode=1000001"
HTTP/2 200
access-control-allow-origin: *
content-type: text/plain;charset=utf-8
x-cloud-trace-context: 2a2e857d7c90820992f424cfcb10a6ee
date: Fri, 12 Aug 2022 12:55:21 GMT
server: Google Frontend
content-length: 287

{
	"message": null,
	"results": [
		{
			"address1": "東京都",
			"address2": "千代田区",
			"address3": "千代田",
			"kana1": "ﾄｳｷｮｳﾄ",
			"kana2": "ﾁﾖﾀﾞｸ",
			"kana3": "ﾁﾖﾀﾞ",
			"prefcode": "13",
			"zipcode": "1000001"
		}
	],
	"status": 200
}
```

## プロジェクト作成

まずはプロジェクトを作成します。

```sh
$ mkdir webapi
$ cd webapi
$ npm init
$ npm install --save-dev typescript ts-loader
$ npm install --save electron
```

TypeScript のトランスパイルのための設定ファイルを作成します。

```sh
$ tsc init
```

npm init で作成された package.json を修正します。scripts の部分で build と start を追加しています。

```json
  "scripts": {
    "build": "tsc",
    "start": "npm run build && electron ./index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

## Web API を呼び出す

index.ts は下記を参考にして作成しました。

- TypeScript と Electron
  https://qiita.com/professor/items/1861ff80e689a377899a

下記をコメントアウトしていますが、レンダラーのデバッグをしたいときにコメントを外します。

```typescript
// this.mainWindow.webContents.openDevTools();
```

```typescript:index.ts
import { BrowserWindow, app, App } from "electron";

class SampleApp {
  private mainWindow: BrowserWindow | null = null;
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  constructor(app: App) {
    this.app = app;
    this.app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    this.app.on("ready", this.create.bind(this));
    this.app.on("activate", this.onActivated.bind(this));
  }

  private onWindowAllClosed() {
    this.app.quit();
  }

  private create() {
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
    });

    this.mainWindow.loadURL(this.mainURL);

    // this.mainWindow.webContents.openDevTools();
    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  private onReady() {
    this.create();
  }

  private onActivated() {
    if (this.mainWindow === null) {
      this.create();
    }
  }
}

const MyApp: SampleApp = new SampleApp(app);
```

index.html です。
郵便番号を入れる入力エリアと検索ボタンがあります。
結果を `<p id="address"></p>` の場所に表示します。このバージョンではグリッド表示ではなく単純なテキスト表示です。クライアント画面で使用する `renderer.js` を読み込んでいます。

```html:index.html
<!DOCTYPE html>
<html>
  <body>
    <h1>郵便番号検索</h1>
    <input type="text" id="zipcode" />
    <button type="button" class="btn btn-primary" id="search">Search</button>
    <br />
    <p id="address"></p>
  </body>
  <script src="./renderer.js"></script>
</html>
```

renderer.js を作成します。
searchAddress 関数で住所を検索しています。検索結果を文字列で連結しているだけです。
検索ボタンがクリックされたときに発火するイベントリスナーを設定します。id="address"のエレメントを探して、HTML テキストを置換しています。

```js:renderer.js
async function searchAddress(zipcode) {
  const response = await fetch(
    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`
  );
  const json = await response.json();
  let addresses = "";
  for (let result of json.results) {
    addresses += result.address1 + result.address2 + result.address3 + " ";
  }
  return addresses;
}

const zipcode = document.getElementById("zipcode");
const address = document.getElementById("address");
const search = document.getElementById("search");

if (search !== null) {
  search.addEventListener("click", () => {
    if (zipcode !== null) {
      searchAddress(zipcode.value).then((addresses) => {
        console.log(addresses);
        if (address !== null) {
          address.innerText = addresses;
        }
      });
    }
  });
}
```

実行してみます。
Web API をうまく呼べて住所を取得することができました。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/1106967/79b64bc1-7d91-83ef-0b7d-29499402ff83.png)

## 検索結果をグリッド表示にする

index.html を修正します。

gridjs.umd.js と mermaid.css を取り込みます。

```html
<link
  href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css"
  rel="stylesheet"
/>
<script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>
```

`<p id="address"></p>` の部分を書き換えます。
Web API からメッセージが返ってきた場合、 `id="message"` の部分に表示するようにします。文字の色を赤にしています。グリッドは `id="address_grid"` の場所に表示します。

```html
<p id="message" , style="color: #f00"></p>
<div id="address_grid"></div>
```

index.html の全体は下記のようになります。

```html:index.html
<!DOCTYPE html>
<html>
  <head>
    <link
      href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css"
      rel="stylesheet"
    />
    <script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>
  </head>
  <body>
    <h1>Web API Sample</h1>
    <input type="text" id="zipcode" />
    <button type="button" class="btn btn-primary" id="search">Search</button>
    <br />
    <p id="message" , style="color: #f00"></p>
    <div id="address_grid"></div>
  </body>
  <script src="renderer.js" charset="UTF-8"></script>
</html>
```

renderer.js を修正します。
テキストで表示していたところに Gridjs を使用します。grid は後で上書きできるようにグローバル変数で定義しています。検索結果がからの時は空のリストをしていして検索結果をクリアしています。グリッドには 6 件ごとにページネーションをする指定を入れています。

```js:renderer.js
async function searchAddress(zipcode) {
  let response = await fetch(
    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`
  );
  return response.json();
}

var grid = null;
document.getElementById("search").addEventListener("click", () => {
  const zipcode = document.getElementById("zipcode").value;
  searchAddress(zipcode).then((response) => {
    const message = document.getElementById("message");
    message.innerHTML = response.message;
    let results = response.results;
    if (results === null) {
      results = [];
    }
    if (grid) {
      grid
        .updateConfig({
          data: results,
        })
        .forceRender();
    } else {
      grid = new gridjs.Grid({
        columns: [
          { id: "zipcode", name: "郵便番号" },
          { id: "address1", name: "都道府県" },
          { id: "address2", name: "市区町村" },
          { id: "address3", name: "町域" },
        ],
        data: results,
        pagination: {
          limit: 6,
        },
      }).render(document.getElementById("address_grid"));
    }
  });
});
```

プログラムを実行してみます。検索結果がグリッドで表示されるようになりました。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/1106967/ea542ca8-b31f-a178-e5bd-3a0868eb92c1.png)

## 検索結果をファイルに保存する

ここまでは普通の Web アプリケーションと同じです。ここからは Node.js の機能を使って住所の検索結果はローカル PC に保存していきます。
Electron ではレンダラーから直接 Node.js の機能を呼び出すことができません。レンダラーから Node.js の機能を呼び出すためにプロセス間通信を行います。まずはレンダラーとメインプロセスを仲介する preload.ts を作成します。contextBridge を使用して、`api.saveData`を呼び出すと、メインプロセスの saveData ハンドラが呼ばれるようにします。

```typescript:preload.ts
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  saveData: (data: object) => ipcRenderer.invoke("saveData", data),
});
```

renderer.ts に下記を追加します。
保存ボタンが押されたら、preload.ts で定義した `api.saveData` を呼び出します。 `api` はグローバル変数 `window` のカスタムプロパティとして追加されています。

```typescript
document.getElementById("save").addEventListener("click", () => {
  console.log("clicked: save button");
  window.api.saveData(results);
});
```

index.ts を修正します。

```typescript
    this.mainWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
```

`saveData` ハンドラを定義し、handleSaveData メソッドにバインドします。

```typescript
ipcMain.handle("saveData", this.handleSaveData.bind(this));
```

handleSaveData メソッドは以下のようになります。

```typescript
  private async handleSaveData(
    event: Electron.IpcMainInvokeEvent,
    data: object
  ) {
    try {
      const result = await dialog.showSaveDialog({
        properties: ["createDirectory"],
      });
      if (result && result.filePath) {
        await fs.writeFile(result.filePath, JSON.stringify(data, null, "  "));
      }
    } catch (err: any) {
      console.error(err.toString());
    }
  }
}
```

ファイル保存ようのダイアログは Electron の dialog モジュールにある`showSaveDialog`を使います。オプションとしてダイアログ内でディレクトリが作成できるように `createDirectory` を追加してます。他にもダイアログのタイトルを変えたりボタンの名前を変えたりいろいろできます。

https://www.electronjs.org/ja/docs/latest/api/dialog#dialogshowsavedialogbrowserwindow-options

`showSaveDialog` は Promise を戻り値とする非同期関数です。 `handleSaveData` メソッドを非同期とすることで、`await`を使って簡単な記法で書くことができます。戻り値のオブジェクト内にある `filePath` にダイアログで指定したファイル名が格納されます。ダイアログをキャンセルした場合、filePath は `undefined` となります。

ファイルへの書き込みは Node.js のモジュールを使用します。fs モジュールを使っても良いのですが、Promise に対応した fs があるのでそちらを使用してみます。まずは Promise 版の fs をインポートします。

```typescript
import { promises as fs } from "fs";
```

ファイルに書き込んでみます。`data` ｊはオブジェクトなので、`JSON.stringify()` を使って JSON 文字列に変換しています。見やすくするために第 3 引数でインデントを指定しています。

```typescript
await fs.writeFile(result.filePath, JSON.stringify(data, null, "  "));
```

実行してみます。ファイルが保存できるようになりました。

![image.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/1106967/022319a4-036b-36b0-2246-e9ca595c4e80.png)

保村したファイルは次のようになります。

```json:address.json
[
  {
    "address1": "岡山県",
    "address2": "岡山市北区",
    "address3": "",
    "kana1": "ｵｶﾔﾏｹﾝ",
    "kana2": "ｵｶﾔﾏｼｷﾀｸ",
    "kana3": "",
    "prefcode": "33",
    "zipcode": "7000000"
  },
  {
    "address1": "岡山県",
    "address2": "岡山市中区",
    "address3": "",
    "kana1": "ｵｶﾔﾏｹﾝ",
    "kana2": "ｵｶﾔﾏｼﾅｶｸ",
    "kana3": "",
    "prefcode": "33",
    "zipcode": "7000000"
  },
(以下省略)
```

# パッケージの作成

パッケージの作成には electron-builder を使用します。

https://www.electron.build/

electron-builder をインストールします。

```sh
$ npm install --save-dev electron-builder
```

package.json に以下を追加します。

```json
  "build": {
    "appId": "com.example.sample.webapi",
    "directories": {
      "output": "dist"
    },
    "files": [
      "index.html",
      "index.js",
      "package-lock.json",
      "package.json",
      "preload.js",
      "renderer.js"
    ]
  },
```

ビルドします。

```sh
$ npx electron-builder
```

オプションを何も指定しないと、ローカル PC に合わせたパッケージができるようです。私は Mac を使っているので、webapi-sample.app というファイルが作成されました。実行してみると、ちゃんと起動されました。

```sh
$ npx electron-builder
```

Windows 向けのインストーラーも作成することができます。

```sh
$ npx electron-builder --win --x64
```

## 最終ソースコード

```html:index.html
<!DOCTYPE html>
<html>
  <head>
    <link
      href="https://unpkg.com/gridjs/dist/theme/mermaid.min.css"
      rel="stylesheet"
    />
    <script src="https://unpkg.com/gridjs/dist/gridjs.umd.js"></script>
    <script
      type="text/javascript"
      src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"
    ></script>
  </head>
  <body>
    <h1>郵便番号検索</h1>
    <input type="text" id="zipcode" />
    <button type="button" class="btn btn-primary" id="search">検索</button>
    <br />
    <p id="message" , style="color: #f00"></p>
    <div id="address_grid"></div>
    <button type="button" class="btn" id="save" disabled>保存</button>
  </body>
  <script src="renderer.js" charset="UTF-8"></script>
</html>
```

```typescript:index.ts
import { BrowserWindow, app, App, ipcMain, dialog } from "electron";
import path = require("path");
import { promises as fs } from "fs";

const DEBUG_MODE = false;
class SampleApp {
  private mainWindow: BrowserWindow | null = null;
  private app: App;
  private mainURL: string = `file://${__dirname}/index.html`;

  constructor(app: App) {
    this.app = app;
    this.app.on("window-all-closed", this.onWindowAllClosed.bind(this));
    this.app.on("ready", this.create.bind(this));
    this.app.on("activate", this.onActivated.bind(this));
    ipcMain.handle("saveData", this.handleSaveData.bind(this));
  }

  private onWindowAllClosed() {
    this.app.quit();
  }

  private create() {
    let windowSize = { width: 800, height: 600 };
    if (DEBUG_MODE) {
      const { screen } = require("electron");
      const primaryDisplay = screen.getPrimaryDisplay();
      windowSize = primaryDisplay.workAreaSize;
    }
    this.mainWindow = new BrowserWindow({
      width: windowSize.width,
      height: windowSize.height,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    });

    this.mainWindow.loadURL(this.mainURL);

    if (DEBUG_MODE) {
      this.mainWindow.webContents.openDevTools();
    }

    this.mainWindow.on("closed", () => {
      this.mainWindow = null;
    });
  }

  private onReady() {
    this.create();
  }

  private onActivated() {
    if (this.mainWindow === null) {
      this.create();
    }
  }

  private async handleSaveData(
    event: Electron.IpcMainInvokeEvent,
    data: object
  ) {
    try {
      const result = await dialog.showSaveDialog({
        properties: ["createDirectory"],
      });
      if (result && result.filePath) {
        await fs.writeFile(result.filePath, JSON.stringify(data, null, "  "));
      }
    } catch (err: any) {
      console.error(err.toString());
    }
  }
}

const MyApp: SampleApp = new SampleApp(app);
```

```typescript:preload.ts
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  saveData: (data: object) => ipcRenderer.invoke("saveData", data),
});
```

```js:renderer.js
"use strict";

async function searchAddress(zipcode) {
  let response = await fetch(
    `https://zipcloud.ibsnet.co.jp/api/search?zipcode=${zipcode}`
  );
  return response.json();
}

let grid = null;
let results;

document.getElementById("search").addEventListener("click", () => {
  const zipcode = document.getElementById("zipcode").value;
  searchAddress(zipcode).then((response) => {
    const message = document.getElementById("message");
    message.innerHTML = response.message;
    results = response.results;
    if (results === null) {
      results = [];
    }
    if (grid) {
      grid
        .updateConfig({
          data: results,
        })
        .forceRender();
    } else {
      grid = new gridjs.Grid({
        columns: [
          { id: "zipcode", name: "郵便番号" },
          { id: "address1", name: "都道府県" },
          { id: "address2", name: "市区町村" },
          { id: "address3", name: "町域" },
        ],
        data: results,
        pagination: {
          limit: 6,
        },
      }).render(document.getElementById("address_grid"));
    }
    document.getElementById("save").disabled = results.length === 0;
  });
});

document.getElementById("save").addEventListener("click", () => {
  console.log("clicked: save button");
  window.api.saveData(results);
});
```

```json:package.json
{
  "name": "webapi-sample",
  "version": "1.0.0",
  "description": "",
  "main": "index.js",
  "scripts": {
    "build": "tsc",
    "start": "npm run build && electron ./index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "build": {
    "appId": "com.example.sample.webapi",
    "directories": {
      "output": "dist"
    },
    "files": [
      "index.html",
      "index.js",
      "package-lock.json",
      "package.json",
      "preload.js",
      "renderer.js"
    ]
  },
  "author": "",
  "license": "ISC",
  "devDependencies": {
    "electron-builder": "^23.3.3",
    "typescript": "^4.7.4",
    "webpack-cli": "^4.10.0"
  }
}
```

# 最後に

Electron でアプリケーションを作るのは初めてです。TypeScript も慣れてません。Promise も理解したばかりの初心者です。

# 参考サイト
