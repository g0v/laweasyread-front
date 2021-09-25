# 「法規亦毒氣」開發紀錄

這是給程式設計師看的版本。一般使用者請參閱 [`changelog.md`](changelog.md) 。

## 1.6.4
2021-09-25
* 棄用 `console.log` ，改用其 `info` 或 `debug` 方法取代。
* 開始建立 `LER` 的事件機制，從將之改以 `EventTarget` 類別宣告起。

## 1.6.2
2021-09-21
* 改回統一抓 `kong0107/mojLawSplitJSON` 的 `arranged` 分支…
* 重整全國法規資料庫的編章節為巢狀結構，以利多層的 `position: sticky` 順利運作。（否則如民法滑到最下面時仍會顯示「第 3 目 分別財產制」）

## 1.6.0
2021-09-19
* 「自動轉換」功能改為預設關閉。
* 更新法規列表時，改抓 `kong0107/mojLawSplitJSON` 的 `arranged` 分支，其 `pcode` 是小寫。但 `LER.popup.js` 下載法規時仍是用 `gh-pages` 分支的內容。（ v1.6.1 時又改回去了）
* 因為全國法規資料庫已不使用換行字元排版，故：
  * 刪除 `.LER-warning` 等 CSS，畢竟以往難以判斷的「不確定有沒有分項」情形不會發生了。
  * 暫不處理全國法規資料庫的排版，因為其新的結構雖然不是巢狀表單，但還算清楚。

## 1.4.1
2019-01-03
* 修正 #32

## 1.4.0
2019-01-01
* 因應「全國法規資料庫」網站改版，調整：
  * `popup.html` 的表單與連結
  * `LER.js` 和 `LER.popup.js` 生成連結的字串樣板
  * `moj.js` 關於關鍵字的偵測
  * `.LER-stratum-*` 的 margin 跟 padding 。
* 對單一條文和多個條文，連向不同的全國法規資料庫頁面。

## 1.3.6
2018-12-19
* 本來想支援 Microsoft Edge 44 ，但想起它之後要換成 Chrominum 核心，不確定給外掛的 API 會變動多少。
  為避免之後「只更新外掛但沒更新 Edge 的，反而變得不能用了」的困擾，決定等新版的 Edge 公布後再說。
  但還是記錄一下發現的事：
  * `domCrawler` 和 `LER` 順利相容，問題幾乎都出在 browser API 。
  * `mozilla/webextension-polyfill` 是把使用回呼機制的 `chrome` 包成使用 Promise 機制的 `browser` ，但 [Edge 是在 `browser` 使用回呼機制](https://docs.microsoft.com/en-us/microsoft-edge/extensions/api-support/supported-apis)。
    理想上也許就是改寫 `webextension-polyfill` ，改寫成「 `browser` 包成 `browser2` （或別的名字）」。
  * `overflow: visible auto` 不如預期，垂直方向實際也變成 `visible` 。
  * `manifest.json` 中只支援 `options_page` 。幸好其他瀏覽器也允許同時存在 `options_ui` ，沒有因為兩個值同時存在而報錯。
  * 沒有 `trimStart` 和 `trimEnd` ，幸好還有 `trimStart` 和 `trimEnd` 。 （目前僅實際用於 `lawtext2obj` ）
* 整理 `LER.popup.js` 。

## 1.3.5
2018-12-18
* 改善立法院法律系統的版面分析的程式碼可讀性。
* 在 Firefox 隱藏彈出視窗的立法院法律系統搜尋框（因為未能順利運作）。
* 將「列出本頁所有（或選取處）的法律資料」功能改為逐一顯示，並將各法律、條號與釋字標題均改為連結。

## 1.3.2
2018-12-16
* 「列出本頁的法律資料」不會在 `iframe` 元件中出現，但能夠抓取其內的資料（如果有權限的話）。藉此改善在全國法規資料庫的搜尋介面使用時的體驗。

## 1.3.1
2018-12-09
* 調整更新時的 `fetch()` 快取設定。避免已能更新時，瀏覽器仍是抓本機快取。但平常抓法條跟釋字仍是用預設模式，即只在本機快取自己顯示已過期時才會抓新的。參閱 [Request.cache | MDN](https://developer.mozilla.org/en-US/docs/Web/API/Request/cache) 。
* 更新法規名稱時也從網路更新法規簡稱對照表。亦即， `data/aliases.json` 將跟 `data/laws.json` 一樣，只在安裝時會使用。

## 1.3.0
2018-12-09
* 新增要求選單權限，以支援「找出滑鼠框選處所提到的法律資料」功能。
* 新功能「列出本頁所有法律資料」及「找出滑鼠框選處所提到的法律資料」係將全頁面所有內容接成一個字串再去解析。條號與法律的關係則用舊版的方式：由文件前後關係判斷，看前一個出現的法律是誰。

## 1.2.7
2018-12-07
* 處理在 `<a />` 之中的物件：不加上連結但滑鼠移過時會有浮動窗。

## 1.2.6
2018-12-05
* 改善浮動窗的 CSS ，於下列網站中校正（後續應該找 [CSS Reset 或 normalize](https://ithelp.ithome.com.tw/articles/10196528) ） ：
  * [法律白話文](https://plainlaw.me/2017/07/26/inherit/) 內文的容器的 z-index 是 1000 。
  * [聯晟法網](https://www.rclaw.com.tw/post-254-2917) 浮動窗中的連結變成白色的字，因為 `a:link` 的優先權較高，只好用 `!important` 蓋掉。
  * [法操](https://www.follaw.tw/f06/16740/) 將 `dt` 和 `dd` 設定為浮動且寬度不是 100% ，故加上了 `width: auto` 規則。

## 1.2.5
2018-12-05
* 支援把浮動窗固定住。
* 修正一般設定中的存錯資料的問題。
* 還原全國法規資料庫搜尋關鍵字的變色。
* 將遠端存取權限限縮到 `https://cdn.jsdelivr.net/gh/kong0107/` 。

## 1.2.3
2018-12-05
* 取消「偵測到算式／表格」和「可能沒有分段」的警告。
* 新增不處理的選擇器 `.LER-skip` 。
* 修正在立法院法律系統使用關鍵字搜尋時，被標註的關鍵字顯示錯誤的問題。

## 1.2.0
2018-12-05
* 重新編排「設定」頁面。
* 支援用星號的方式標註例外網站格式。（如果規則中有反斜線，仍會被當作正規表達式）
* 將「預設例外清單」的檔案獨立出來，並於更新套件時新增例外清單（而非替換整份清單）。
* 設定頁面改用分頁標籤的模式。（手刻了一個簡易的路由器）
* 更動部分檔案路徑，新增資料夾 `options_ui` 和 `data` 。
* 棄用 marked ，不於選項頁面讀取 `*.md` 。
* 新增 `todo.md` ，記著接下來要做的小事們。

## 1.1.4
2018-12-04
* 修正立法院法律系統的條號顯示。（「條」與「之」字之間有空格）
* 偵測「這裡可能沒有分項」。
* 偵測條文中的表格或算式（由 `lawtext2obj` 實作），並於該項款目不予轉換，用 `<pre />` 放入原本的東西。
* 於偵測到表格或算式時顯示提示。
* 在 `package.json` 的 `script.prepare` 加上 `git submodule update` ，這樣 `npm install` 時就可以把子模組也一起載入。
* <del>可於選項頁面閱覽更新紀錄。</del>（於 1.2.0 版刪除）

## 1.1.1
2018-12-02
* 增加 `LICENSE` 和 `changelog-dev.md` 。
* 將 `manifest.json` 的 `options_page` 改為 `options_ui` 。
* 在整個頁面都沒有比對到法規名稱的情形，不轉換條號。（解決 #24 。參閱變數 `LER.matchedAnyLaw` ）
* 略去處理寬度或高度為 0 的 iFrame 。

## 1.1.0
2018-12-02
* 使用 [mozilla/webextension-polyfill](https://github.com/mozilla/webextension-polyfill) ，改寫為亦支援 Firefox 與 Opera 。
* 改為非同步轉換（搭配 domCrawler 的更新），以避免轉換期間網頁不能動。

## 1.0.1
2018-12-01
* 安裝時即讀取 `aliases.json` 。
* 大法官解釋的連結與預覽。

## 1.0.0
2018-11-30
* 完全重寫，增加程式碼可讀性並使用 ES6 語法。
* 將 DOM 的處理拆給另一個專案 [domCrawler](https://github.com/kong0107/domCrawler/) 。
* 將「把換行字元的排版方式解析成項款目結構」的功能拆給另一個專案 [lawtext2obj](https://github.com/kong0107/lawtext2obj/) 。
* 將資料外包給其他專案 [mojLawSplitJSON](https://github.com/kong0107/mojLawSplitJSON) 和 [jyi](https://github.com/kong0107/jyi) ，讀取其在 jsDelivr 的檔案。
* 彈出框改讀取遠端資料再顯示，而不再內嵌網頁。（解決 #30 ）
* 讓使用者選擇條號轉換的方式。（解決 #28 ）
