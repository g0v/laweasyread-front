# 「法規亦毒氣」開發紀錄

這是給程式設計師看的版本。一般使用者請參閱 [`changelog.md`](changelog.md) 。
另參[第一版之開發紀錄](https://github.com/g0v/laweasyread-front/blob/v1.x/changelog-dev.md)

## 2.0.0831
2022-08-31
* 改為 Manifest V3 並重建架構。
  幾乎還沒有功能。有些檔案之後仍可能刪除。
* 棄用 `git submodule` ，如需引用其他專案，則使用 `npm install` 。
* 將 `LER` 設計成只在 background 把字串處理成能序列化的物件，前台 (content script) 看不到 `LER` 。
* 棄用 `domCrawler` ，改為針對專案而設計函式。
* 前後台共用函式庫 `lib.js` 。
  原本想用 module 模式，但因 content scripts 不能用 module ，只好 background 也不用。亦注意：
  * `module.exports` 只有 Node.js 能用，瀏覽器不行。
  * `importScript()` 不能用在模組模式。
* 暫不考慮做為其他網站可引入的功能，而是針對瀏覽器外掛。
* 將 `PCode` 全面改為 `pcode` ；資料改為引入 `kong0107/mojLawSplitJSON` 專案的 [`arranged` 分支](https://github.com/kong0107/mojLawSplitJSON/tree/arranged)。
