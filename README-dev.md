# Development

## Algorithm

對所有文字節點的內容進行比對，若內容包含法規名稱，則置換成新的 HTML 元素。

1. 前端將第一個 `TextNode` 的 `textContent` 和 *某些特徵* 傳給後端。
2. 後端依照 `ReplaceRule[]` 將前述字串拆為 `Fragment[]` 。此步驟只處理字串，每個被拆開的物件和字串彼此獨立。
3. 後端將前述 `Fragment[]` 轉換為 `JsonElement[]` 並傳給前端。此步驟涉及陣列中個物件之間的前後關係，並參考原始文字節點的 *某些特徵* 。
4. 前端用 `createHtmlElement()` 將前述 `JsonElement[]` 轉為 `HTMLElement[]` 。
5. 前端將步驟一的 `TextNode` 置換為前述 `HTMLElement[]` 。
6. 回到步驟一，但傳送的是下一個 `TextNode` 的資料。


## Files

* `changelog.md`: [更新紀錄](changelog.md)
* `changelog-dev.md`: [開發紀錄](changelog-dev.md)
* `g0v.json`: G0V 專案設定
* `package.json`: Node.js 專案設定
* `manifest.json`: 瀏覽器擴充元件設定
* ~~`LER.js`: 本專案主程式~~
* ~~`LER.popup.js`: 浮動視窗程式碼~~
* `data/`:
  * `data/aliases.json`: 法規的簡稱、暱稱對照。
  * `data/options_default.json`: 預設的使用者設定。
  * `data/exclude_terms.txt`: 不要匹配的詞彙清單。

其餘請閱讀 `manifest.json` 。

## Data Sources

* [mojLawSplitJSON](https://github.com/kong0107/mojLawSplitJSON)
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
* `content_scripts`
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


# License

[MIT License](http://en.wikipedia.org/wiki/MIT_License)再加上一條：
被授權人於出版發行、散布、再授權及販售軟體及軟體的副本時，應於MIT授權條款上方或下方加上此規則，並：
* 陳述被授權人對於一個以上之公共議題之立場；或
* 附上與其立場類似之文章之永久連結。

此軟體此版本設定之公共議題為「性別」，立場為「性解放」，支持十歲以上智識者均得自主與人發生性行為與性交易，「性忠貞」並不是「道德」的一部份。（參閱[反守貞地圖．哲學哲學雞蛋糕](http://phiphicake.blogspot.tw/2013/06/blog-post_4.html)。惟亦請留意諸多國家規定與未達法定年齡者合意性交、性交易仍需受刑事或行政處罰。於中華民國，與未滿十六歲者合意猥褻或性交、引誘未滿十八歲者為猥褻或性交，以及與任何人為有對價之性交或猥褻行為，均為法律所禁止。參閱刑法第227條、兒童及少年福利與權益保障法第2條、第49條第9款、第97條第1項、兒童及少年性剝削防制條例第2條、第31條、社會秩序維護法第80條。）


## License Explanation

* 於其軟體再版時，得變更議題與立場、連結。
* 軟體之使用與修改者，無須同意原軟體授權條款中，基於本規則而對特定議題表態之立場。
