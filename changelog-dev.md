# 「法規亦毒氣」開發紀錄

這是給程式設計師看的版本。一般使用者請參閱 [`changelog.md`](changelog.md) 。
另參[第一版之開發紀錄](https://github.com/g0v/laweasyread-front/blob/v1.x/changelog-dev.md)。


//     統一用語：浮動視窗、彈出窗格、…
// 註解的呈現，用 bootstrap 的 tooltip？

## 2.0.1101
2022-11-xx
* 為了方便開發除錯不用每次都重新載入套件，也為了初衷的網站嵌入，決定再次重新規劃結構。
  依照「就瀏覽器外掛而言，可否集中到後端執行，或必須每頁都嵌入執行」和「是否需要瀏覽器外掛的相關 API 」，將每段程式碼區分為四類。
  應時做兩種 API 。對前端而言就是呼叫 `parseElement(Node node, Object options)` 時要有固定的方式呼叫讀取法規、建構 popup 的機制，只是在瀏覽器外掛時、和作為網站嵌入程式時要介接不同的東西（而這些「不同的東西」對外有相同的 API ）。
* 預計採用 Shadow DOM 機制，以利 CSS 不互汙染。

## 2.0.1004
2022-10-15
* 實作「本法」、「本條例」，但未支援該詞彙係指母法之情形。
* 因應法規資料來源格式變更，彈出窗格嵌入巢狀結構的條文內容。
* 動態規則物件類別新增「位置」屬性，以區別要在靜態規則們之前或之後套用。
  此設計是為了讓憲法法庭裁判字號中的「憲法」不會被比對到，也要讓同婚專法全名中的「釋字第七四八號」不會被比對到。

## 2.0.0910
2022-10-06
* 將常用函式庫獨立出去為 [kong-util](https://www.npmjs.com/package/kong-util) 。
* 因應法規資料來源格式變更。

## 2.0.0832
2022-09-01
* 修復 action popup 。
* 修復 options_ui 的部分分頁功能。
* 更新引用的 Bootstrap 至 5.2 版。
* 更新 `createElement()` 。

## 2.0.0831
2022-08-31
* 改為 Manifest V3 並重建架構。
* 棄用 `git submodule` ，如需引用其他專案，則使用 `npm install` 。
* 將 `LER` 設計成只在 background 把字串處理成能序列化的物件，前台 (content script) 看不到 `LER` 。
* 棄用 `domCrawler` ，改為針對專案而設計函式。
* 前後台共用函式庫 `lib.js` 。
  原本想用 module 模式，但因 content scripts 不能用 module ，只好 background 也不用。亦注意：
  * `module.exports` 只有 Node.js 能用，瀏覽器不行。
  * `importScripts()` 不能用在模組模式和 content scripts 中。
* 暫不考慮做為其他網站可引入的功能，而是針對瀏覽器外掛。
* 將 `PCode` 全面改為 `pcode` ；資料改為引入 `kong0107/mojLawSplitJSON` 專案的 [`arranged` 分支](https://github.com/kong0107/mojLawSplitJSON/tree/arranged)。
