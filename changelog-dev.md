# 「法規亦毒氣」開發紀錄
這是給程式設計師看的版本。一般使用者請參閱 [`changelog.md`](changelog.md) 。
另參[第一版之開發紀錄](https://github.com/g0v/laweasyread-front/blob/v1.x/changelog-dev.md)。

## todo
* manifest V3
* shadowRoot
* 棄用或簡化使用 kongUtil
* 減少 content_scripts，盡量挪到 background


# 2.0.4
2023-02-26
* 本專案未修正，實際是 `kongUtilDom.createElementFromJsonML()` 在呼叫 `TokenList.add()` 時沒有給予引數的關係。


# 2.0.2
2023-01-13
* `parseChineseNumber()` 的問題，實際是在 `kong-util` v0.6.7 修正。


# 2.0.1
2023-01-06
* 舊函式庫 `./lib.js` 路徑改為 `./lib/storage.js` 。
* 棄用 `npm install` 引用，改為手動複製 `kong-util` 的 `dist/all.js` 成為 `./lib/kong-util.js` 。（同機開發時，則改使用硬連結）
* `content_scripts/moj.law.css` 改成動態匯入，以實作「讓使用者決定是否對該站重新排版」的功能。


# 2.0.0
2023-01-01
* 重建專案結構。
* Chrome 系列的改為 Manifest V3 ； Firefox 維持 Manifest V2 （打包前需另更名處理）。
* 更新引用的 Bootstrap 至 5.2 版。
* 棄用 `domCrawler` 。
* 棄用 `git submodule` 。
* 將常用函式庫獨立出去為 [kong-util](https://www.npmjs.com/package/kong-util) ，~~用 `npm install` 引用。~~**後於 2.0.1 再改為手動複製。**
* 將 `PCode` 全面改為 `pcode` ；資料改為引入 `kong0107/mojLawSplitJSON` 專案的 [`arranged` 分支](https://github.com/kong0107/mojLawSplitJSON/tree/arranged)。
* 動態規則物件類別新增「位置」屬性，以區別要在靜態規則們之前或之後套用。
  此設計是為了讓憲法法庭裁判字號中的「憲法」不會被比對到，也要讓同婚專法全名中的「釋字第七四八號」不會被比對到。
* 彈出式視窗改用 Shadow DOM ，以避免 CSS 相互汙染。
* 切開 `LER` 中後台與前台的機制。
* 前後台共用函式庫 `./lib.js` 。**後於 2.0.1 更改路徑為 `./lib/storage.js` 。**
