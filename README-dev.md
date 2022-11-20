# Development

## Algorithm

對所有文字節點的內容進行比對，若內容包含法規名稱，則置換成新的 HTML 元素。

1. 前端將第一個 `TextNode` 的 `textContent` 和 *某些特徵* 傳給後端。
2. 後端依照 `ReplaceRule[]` 將前述字串拆為 `Fragment[]` 。此步驟只處理字串，每個被拆開的物件和字串彼此獨立。
3. 後端將前述 `Fragment[]` 轉換為 `JsonElement[]` 並傳給前端。此步驟涉及陣列中個物件之間的前後關係，並參考原始文字節點的 *某些特徵* 。
4. 前端用 `createElement()` 將前述 `JsonElement[]` 轉為 `HTMLElement[]` 。
5. 前端將步驟一的 `TextNode` 置換為前述 `HTMLElement[]` 。
6. 回到步驟一，但傳送的是下一個 `TextNode` 的資料。

前述「後端」並非指伺服器，而是瀏覽器擴充功能的背景頁。
原則是：盡量將可反覆進行的事情留在後端，只將「必須放在前端」的事情在前端做。以利用「後端只有一個實體」的機制節省資源。
開發時須留意後端沒有 DOM ，也就是沒有 `Document` 類別、沒有 `document` 實體，且前後端間只能傳輸可序列化資料。

## Files

### meta
* `README.md`: 給一般人看的專案說明
* `README-dev.md`: 給開發者看的專案說明
* `LICENSE.md`: 授權條款
* `changelog.md`: 給一般人看的更新紀錄
* `changelog-dev.md`: 給開發者看的開發紀錄
* `g0v.json`: G0V 專案設定
* `package.json`: Node.js 專案設定
* `manifest.json`: 瀏覽器擴充元件設定

### for either case
* `LER.js`

### only for browser extension
* `demo.html`
* `icon.*`
* `data/`:
  * ~~`data/aliases.json`: 法規的簡稱、暱稱對照。~~
  * `data/options_default.json`: 預設的使用者設定。
  * `data/exclude_terms.txt`: 不要匹配的詞彙清單。
* `options_ui/`: 設定 UI 頁面
* `content_scripts/`: 要內嵌於不同網頁的
* `browser/`: 後台執行

### only for embed JS



## Data Sources

* [mojLawSplitJSON](https://github.com/kong0107/mojLawSplitJSON/tree/arranged)
* [jyi](https://github.com/kong0107/jyi)


## Important Cases

* 不符合中央法規標準法所定的格式：
  * 所得稅法第4條（第1項第16款第2段、第22款第3段）、第14條（第1項第9類第1款第2段）、第17條（第1項第2款第3目之6.(2)）
  * 土地法第2條（「類」）
* 多個條文引用，且條文引用包含「前段」、「但書」等字樣：
  * 政黨法第7條第3項第3款
* 算式：
  * 全民健康保險藥物給付項目及支付標準 第75條
  * 營利事業所得稅查核準則第16條
* 表格
* 原始資料缺漏一些標點符號：
  * 中央研究院組織法第7條第1款


## To-Do List

* `options_ui/tools`
* `options_ui/exclusion`
* 立法院法律系統在所得稅法第14條的問題
* 嘗試支援「前條」。
* 整合 ronnywang 抓下來的立法院資料。
  * 「相關法條」資料
  * 正確的分項（除了所得稅法§14）
* 支援法規名稱被框住之後的條號連結，例如 `《刑法》第10條` 。
* 支援更多條號的格式（例如 `民法第3至5條` 、 `民法1124條`），但不能在不需要的時候跳出來。
* 支援切換成「只處理白名單中的網站」。
* 裁判書連結。
* 於頁面在例外清單中時，顯示適當標記。
* 民國年換成西元年
* 判斷各種細則、辦法裡面所稱的「本法」是誰
