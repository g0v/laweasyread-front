# 「法規亦毒氣」開發紀錄

這是給程式設計師看的版本。一般使用者請參閱 [`changelog.md`](changelog.md) 。
另參[第一版之開發紀錄](https://github.com/g0v/laweasyread-front/blob/v1.x/changelog-dev.md)。

## 2.0.0
2023-01-xx
* 重建專案結構。
* Chrome 系列的改為 Manifest V3 ； Firefox 維持 Manifest V2 。
* 更新引用的 Bootstrap 至 5.2 版。
* 棄用 `domCrawler` 。
* 棄用 `git submodule` 。
* 將常用函式庫獨立出去為 [kong-util](https://www.npmjs.com/package/kong-util) ，用 `npm install` 引用。
* 將 `PCode` 全面改為 `pcode` ；資料改為引入 `kong0107/mojLawSplitJSON` 專案的 [`arranged` 分支](https://github.com/kong0107/mojLawSplitJSON/tree/arranged)。
* 動態規則物件類別新增「位置」屬性，以區別要在靜態規則們之前或之後套用。
  此設計是為了讓憲法法庭裁判字號中的「憲法」不會被比對到，也要讓同婚專法全名中的「釋字第七四八號」不會被比對到。
* 採用 Shadow DOM 機制，以避免 CSS 相互汙染。
* 切開 `LER` 中後台與前台的機制。
* 前後台共用函式庫 `lib.js` 。
  原本想用 module 模式，但因 content scripts 不能用 module ，只好 background 也不用。亦注意：
  * `module.exports` 只有 Node.js 能用，瀏覽器不行。
  * `importScripts()` 只有 Chrome 系列的支援，且仍不能用在模組模式和 content scripts 中。
