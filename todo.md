# To-Do List

* Manifest V3 （以本專案 v2.0 版實作）
* 不要用 `git submodule` ，都改用 `npm` 。
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
* LER 應該在 background 就好，只有 defaultLaw 需要在 content
  content script 把 textnode 裡的純文字丟過去（要確認message機制可傳的上限）， background 把 JSON （或其物件）丟回來，再由 content script 自己把物件建成 Element 。
