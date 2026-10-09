# GV 動画の WASM / Stream 対応実装計画

## 1. 目的

本計画のゴールは、Mystral 上で JavaScript から GV 動画を再生できるようにすることです。

最終到達条件は次のとおりです。

- q5.js から GV 専用の `loadGV()` / `createGVVideo()` 相当のオブジェクトを使って、GPU テクスチャとして描画できる
- GV はフルロードではなくストリーミングで処理する
- 60 FPS を維持できる
- 低メモリ消費・低レイテンシの設計で、Mystral のネイティブ実行環境に収まる

> ここでの `video` は DOM の `HTMLVideoElement` ではなく、q5.js が直接扱う GV frame stream + texture object を指す。

> 重要な前提として、GV はオンメモリで読むと大きくなりやすいため、メモリ占有を抑えるためのストリーミング構成を前提に設計する。

---

## 2. 現状整理

このリポジトリでは以下がすでに揃っています。

- q5.js 側で「描画対象としての画像/テクスチャ」の扱いがある
- Mystral Native 側で `fetch()` と非同期ファイル読み込みの土台がある
- GV の既存実装が Rust / Odin の両方で別途作られており、デコーダの知見がある

ただし、参考リポジトリの実装を見ると GV は「movie player」ではなく「decoder / GPU texture 供給層」であることが分かります。

- `refs/rust-gv-video` の README では、GV は「LZ4 compressed GPU textures with stored address tables」であり、movie player そのものではない
- `refs/odin-gv` の README でも「This module provides only decoder, not player」と明記されている
- つまり、GV 形式は `HTMLVideoElement` と同種の DOM API を前提にしたメディアではなく、独自の compressed frame table を持つ GPU 向けフォーマットである

このため、現状の構成で次の制約が明確になっています。

- `fetched blob -> createImageBitmap` のような 2D 画像向けの経路では GV を自然に扱えない
- Mystral は DOM 環境ではないため、`HTMLVideoElement` 相当の抽象をそのまま作るのは不適切
- GV はオンメモリで読むと大きくなりやすく、ストリーミングの設計が必須である
- q5.js 側も「DOM 互換の video オブジェクト」ではなく、GV 専用の JS レイヤーを持つ必要がある

---

## 3. 採用方針

### 3.1 推奨アーキテクチャ

最初の実装は、以下の構成を推奨します。

1. Mystral native 側に「ランダムアクセス可能な汎用 file/stream API」を追加する
2. GV のメタデータ解析、frame index 読み取り、LZ4 解凍、decode は WASM 側で担当する
3. q5.js は `HTMLVideoElement` 風のラッパーではなく、`GVVideo` / `GVTextureStream` のような GV 専用オブジェクトを持つ
4. GPU 描画は、WASM が返した最新フレームを直接テクスチャへ upload し、`image(tex, x, y)` 相当の描画へ接続する

ここでの核心は、native に持たせるのは「ファイルに対する汎用的な read / seek / random access」だけであり、GV の frame lifecycle や decode pipeline は WASM 側に寄せることです。LZ4 と decode は本質的にメディア処理なので、Mystral native に持たせるより WASM の方が自然です。

> 実運用上は、Mystral native 側に generic file stream API を持たせて、GV はその上に載るだけにする方がやや広い再利用性を保てます。decode は WASM に委譲し、native は I/O のみを担うのが適切です。

### 3.2 GV の本質と API 設計

GV は「再生機能付きのメディア要素」ではなく、次のような GPU 向けの圧縮フレーム形式です。

- ヘッダに width / height / frame count / fps / format がある
- 各フレームは LZ4 圧縮された block を持つ
- frame address / size の table がファイル末尾に存在する
- デコード後のテクスチャは DXT / BC7 などの圧縮形式をそのまま GPU へ渡せる

そのため、q5.js の API は DOM 的な `video.play()` ではなく、次のような GV 専用の interface に寄せるべきです。

```js
const gv = await q5.loadGV('/assets/example.gv');
gv.play();

q5.draw = () => {
  gv.draw(0, 0);
};
```

もしくはより低レベルに寄せるなら次の方が安全です。

```js
const gv = await q5.createGVVideo('/assets/example.gv');
gv.seek(0);
gv.updateFrame();
image(gv.texture, 0, 0);
```

この設計では `HTMLVideoElement` を模倣しないことが重要で、Mystral の非 DOM 実行環境と整合します。

### 3.3 WASI について

WASI は一見有力ですが、初期実装では優先度は低めにするのが安全です。

- WASI はホストファイル I/O を抽象化できるが、Mystral の実行モデルにそのまま載せるには調整が多い
- GV の本質は「圧縮フレームの stream read + decode + upload」であるが、I/O のみを native に寄せる方が汎用性と分離がよい
- したがって、最初は「WASI 全導入」ではなく、「Mystral native の generic file stream API を最小限実装し、必要に応じて WASM 側から触れる」戦略がよい

### 3.4 実装言語

- Mystral native の file / stream API: C++ を推奨
- WASM 側の decode backend: Rust を推奨
- q5.js 側の GV adapter: JavaScript

理由:

- GV の既存知見が Rust/C++ 両方で蓄積している
- `odin-gv` と `ofxExtremeGpuVideo` の実装を見る限り、native には file-level の random access API が必要である
- Mystral の core runtime は C++ ベースで、read / seek / buffer lifecycle の低レベル管理に適している
- LZ4 / decode / frame generation は WASM 側に寄せる方が、責務が明確で再利用性が高い
- q5.js 側は DOM 互換ではなく、GV 専用の JS オブジェクトとして接続するべき

---

## 4. 実装詳細の設計

### 4.1 Stream read path

GV を全量メモリに読み込むのではなく、次の流れで処理する。

1. ファイルを open する
2. ヘッダを読み、width / height / frame_count / fps / format を確認する
3. frame table を末尾から読み、address / size の情報を取得する
4. 必要な frame の compressed block を LZ4 で解凍する
5. GPU に upload 可能な形式に変換する（圧縮データをそのまま渡す or 一時的に CPU decode）
6. ring buffer に保持し、描画スレッドで最新フレームを参照できるようにする

なお、GV は `imageBitmap` のような 2D 画像のような見た目を持つが、内部が圧縮テクスチャ形式である点が重要で、単純な `Video` オブジェクトに帰着させない方がよい。

### 4.2 JS からの API 構想

q5.js との接続では、`HTMLVideoElement` 風の API を作らず、次の GV 専用 interface を目指す。

```js
const gv = await q5.loadGV('/assets/example.gv');
gv.play();

gv.onFrame = () => {
  // optional callback, not DOM event model
};

q5.draw = () => {
  image(gv.texture, 0, 0);
};
```

または q5.js 側でラックとして定義するなら、次のような薄いオブジェクトが適切です。

- `loadGV(path)`
- `play()`
- `pause()`
- `seek(time)`
- `currentFrame`
- `duration`
- `texture`
- `draw(x, y, w, h)`

重要なのは、これが `HTMLVideoElement` の API 互換ではなく、GV の「frame stream + GPU texture」そのものに対応している点です。

### 4.3 Mystral native 側の必要最小限 API

Mystral 側に GV 用の bridge を入れるときは、DOM ではなく file / stream の random access を扱う API を用意するのが妥当です。

- `mystral.openFileStream(path)` のような汎用 file stream
- `read(handle, offset, size)`
- `seek(handle, offset)`
- `readSlice(handle, offset, size)`
- `close(handle)`

GV の decode / frame lifecycle はこのレイヤーの上にある WASM 側で管理するのがよいです。native はファイル I/O の責務だけを持ち、frame table と decode などのメディア処理は Mystral の JS/WASM 側へ移すほうが責務分離と再利用性が高いです。

また、JS 側からは namespace をまとめて、以下のような呼び出しにする。

```js
const stream = await Mystral.openFileStream('/assets/movie.gv');
const header = await wasm.readGVHeader(stream);
const frame = await wasm.readFrame(stream, index);
```

ここでのポイントは、明確に「video DOM」ではなく「任意の binary stream と decode pipeline」を扱うことです。

---

## 5. 実装フェーズ

### フェーズ 0: 前提確認とデータセット選定

- `refs/rust-gv-video` と `refs/odin-gv` の実装を確認し、frame table / decode API を整理する
- 代表的な GV サンプルを用意し、メタデータと LZ4 解凍のベンチマークを計測する
- q5.js に最小限導入できる GV 形式の entry point を決める

### フェーズ 1: Rust WASM デコーダの prototype

- Rust で GV のヘッダ解析と frame table 取得を実装する
- `read frame block -> decompress LZ4 -> return GPU-compatible texture data` の最小 API を決める
- `SharedArrayBuffer` / typed array を通じて Mystral との橋渡しを検討する
- 1 フレームの生成時間を計測し、60 FPS 達成の目安を作る

### フェーズ 2: Mystral native 側の stream bridge

- C++ で汎用 `FileStream` API を定義する
- `jsEngine -> native -> rust wasm` の data path を接続する
- read / seek / random access の API を最小化して、frame lifecycle を WASM 側に委ねる
- ストリーム中断時の abort / close / resume を考慮する

### フェーズ 3: q5.js の GV adapter

- `loadGV()` / `createGVVideo()` を実装する
- `image(gv.texture)` あるいは `gv.draw()` に接続する
- q5.js 側に `currentFrame` / `fps` / `duration` / `readyState` を持たせるが、それは DOM API の模倣ではなく GV に必要な状態管理である

### フェーズ 4: パフォーマンスと安定性

- ring buffer と prefetch を導入し、GPU upload と decode を分離する
- compressed texture の再利用と LZ4 buffer の再使用を徹底する
- 60 FPS を守るため、最初は 720p か 1080p のサンプルで benchmark を行う
- フレーム落ち時の挙動と seek の挙動を決める

---

## 6. パフォーマンス設計

### 6.1 必須要件

- 各 frame は必要時のみ読む
- decode と upload を分離し、描画スレッドがブロックしない
- 先読みで次フレームを準備し、最新フレームを保持する
- LZ4 / compressed texture の再利用を徹底し、メモリを固定化する

### 6.2 性能指標

推奨のベンチマーク基準は次のとおりです。

- 60 FPS を維持することを成功条件とする
- 1 フレーム生成と upload の平均時間を 16.7 ms 未満に収める
- メモリの増加が急激に上がらないこと
- ストリーム再生中に `requestAnimationFrame` が止まらないこと

### 6.3 失敗しやすいポイント

- フルデータロードの設計にするとメモリ制約に破綻する
- `HTMLVideoElement` と同じ抽象を作ると、GV の GPU 圧縮テクスチャ特性と衝突する
- JS だけで decode をせず、native/WASM の役割分担を曖昧にすると 60 FPS を超えない
- `createImageBitmap` に寄せすぎると、GV の独自フォーマットと整合しない

---

## 7. 実装候補の優先順位

### 優先度 A: 最短で成立させる案

- Mystral native で汎用 `FileStream` を作る
- WASM 側で GV header / frame table / LZ4 解凍 / decode を実装する
- q5.js で `loadGV()` / `createGVVideo()` だけを持つ custom layer を作る
- GPU texture を描画へ upload し、最小再生デモを作る

### 優先度 B: 長期的な理想形

- Mystral の stream abstraction を独立化し、GV などの binary media に汎用化する
- Rust ベースの WASM backend を追加し、decode と GPU upload の性能差分を比較する
- WASI 互換の I/O abstraction を検討する
- GPU texture の upload path を最適化し、compressed frame をそのまま利用する

### 優先度 C: 不要と判断できる案

- JS だけで GV を完全に decode する
- フルロードを前提にした実装
- DOM 風の `video` API を Mystral に持ち込む

---

## 8. このリポジトリへの落とし込み

該当の作業は、主に次の場所に入るのが自然です。

- `mystralnative/src/fs/` : stream ファイルアクセスと GV path の実装
- `mystralnative/src/video/` : GV frame table / decode / upload の実装
- `mystralnative/src/runtime.cpp` : JS からの native bridge
- `q5.js` : `loadGV()` / `createGVVideo()` / `image(gv.texture)` の接続
- `docs/` : 実装ノート、ベンチマークメモ、性能メモ

この構成にすると、GV そのものの本質と q5.js の描画レイヤーを分離しやすく、段階的に最適化できる。

---

## 9. 承認前の判断

この修正版の方針は、以下の点で妥当と考えます。

- GV は `HTMLVideoElement` 互換の抽象ではなく、独自の frame stream とテクスチャ形式である
- Mystral は DOM を持たないため、q5.js も DOM 風 API を模倣するのではなく GV 専用の JS layer を持つべきである
- Rust を WASM 側で使うのは自然であり、Mystral 側は stream / bridge 層として C++ を使うのが妥当である
- 目標は「GV を q5.js で描画できる」ことにあり、60 FPS 維持を成功条件にするのが適切である
- まずは「Rust WASM decoder + Mystral native stream bridge + q5.js GV adapter」の 3 層アプローチで着手するのが最も現実的である

---

## 10. 推奨次アクション

1. まず Rust で GV のヘッダ解析と frame table 取得の prototype を作る
2. 次に Mystral native に `GVStream` / `readFrameBlock` を追加する
3. その後 q5.js に `loadGV()` / `createGVVideo()` を追加し、最小再生デモを作る
4. 最後に 60 FPS を確認しながら、LZ4 / upload / ring buffer の最適化を行う

この順序が、GV の独自性と Mystral の非 DOM 実行モデルの両方に合致し、リスクを最小化しながら目標に近づける最も安全な進め方です。
