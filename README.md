# 法規亦毒氣

此瀏覽器外掛
可將網頁中的法規、條文、大法官解釋加上連結，並可於同一頁面瀏覽其內容；
並對全國法規資料庫與立法院法律系統的網頁進行排版調整。

亦可供網站內嵌程式碼（詳後述），而讓網頁中的法規條文變成連結。
若新版（2.0）使用上有問題，欲改回使用舊版（1.8），請參閱後述「手動安裝」段落。


## 瀏覽器外掛安裝

* [舊版下載（需手動安裝）](https://github.com/g0v/laweasyread-front/releases/tag/v1.8.0)
* [Chrome 擴充功能安裝](https://chrome.google.com/webstore/detail/iedodmlnmhobigohbkalkkjlbmdkjalj)
* [Firefox 附加元件安裝](https://addons.mozilla.org/zh-TW/firefox/addon/laweasyread/)
* Edge 瀏覽器可由前述 Chrome Store 的連結安裝擴充功能。
* Opera 延伸套件：
  1. 先安裝 Opera 官方套件 [Install Chrome Extensions](https://addons.opera.com/en/extensions/details/install-chrome-extensions/)
  2. 即可由前述 Chrome Store 的連結安裝擴充功能。
* [更新紀錄](changelog.md)
* [開發文件](README-dev.md)


## 功能示範

[內嵌示範網頁](https://g0v.github.io/laweasyread-front/demo/2.0.html)

安裝後再瀏覽全國法規資料庫：
![全國法規資料庫使用成效](https://g0v.github.io/laweasyread-front/images/demo_moj.png)

安裝後再瀏覽司法院裁判書：
![司法院裁判書系統使用成效](https://g0v.github.io/laweasyread-front/images/demo_judicial.png)

安裝後再瀏覽立法院法律系統：
![立法院法律系統使用成效](https://g0v.github.io/laweasyread-front/images/demo_lis.ly.png)


## 使用說明

* 僅針對收錄於[全國法規資料庫](https://law.moj.gov.tw/)的法規。
* 頁面較複雜或資料較多時，不會瞬間轉換完畢。
* 法條連結均連向最新版的條文，因此瀏覽較舊的文章或判決時務必留意條文可能已經變更。
* 法規名稱、法條內文的更新會晚於全國法規資料庫兩週左右。


## 手動安裝

在[發布頁面](https://github.com/g0v/laweasyread-front/releases)下載所需版本，並解壓縮之。

### Microsoft Edge

1. 點選網址列右方的拼圖圖示，選擇「管理擴充功能」；或從網址列輸入 `edge://extensions/` 以進入設定介面。
2. 於左側選單開啟「開發人員模式」。
3. 於上方點選「載入解壓縮」。
4. 選擇解壓縮後的資料夾。


### Google Chrome

1. 點選網址列右方的拼圖圖示，選擇「管理擴充功能」；或從網址列輸入 `chrome://extensions/` 以進入設定介面。
2. 於右上方開啟「開發人員模式」。
3. 於左上方點選「載入未封裝項目」。
4. 選擇解壓縮後的資料夾。


### Mozilla Firefox

1. 將解壓縮後的 `manifestV2.json` 改名為 `manifest.json` 。（若有同名檔案，需先刪除或更名）
2. 用下列方法「之一」開啟除錯設定介面：
   * 從網址列輸入 `about:debugging#/setup` 。
   * 點選瀏覽器右上角的漢堡選單（三橫線），選擇「附加元件與佈景主題」，再點選「管理您的擴充套件」右方的齒輪圖示，選擇「對附加元件除錯」。
3. 點選「載入暫用附加元件…」
4. 選擇解壓縮後的資料夾之內的 `manifest.json` 檔案。


### 網站內嵌

在 HTML 原始碼中的 `</body>` 前加上：

```html
  <script src="https://cdn.jsdelivr.net/npm/kong-util@0.6.7/dist/all.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/g0v/laweasyread-front@2.0.1/LER.back.min.js"></script>
  <script src="https://cdn.jsdelivr.net/gh/g0v/laweasyread-front@2.0.1/LER.front.min.js"></script>
  <script>
    LER.parseDocument({
      articleNumberFormat: 'hyphen',
      enablePopup: true,
    });
  </script>
```


### 隱私權政策

本程式會：
* 將您的使用設定存在您的電腦中。
* 讓您的瀏覽器向第三方網站 `cdn.jsdelivr.net` 進行連線，以取得法規資料。
  該站是紐約時報也信任的網站服務，因此可以放心，亦可親自查閱[他們的隱私權政策](https://www.jsdelivr.com/privacy-policy-jsdelivr-net)。

除上述情形外，本程式不會蒐集您的資料，亦不會傳送給任何人或機構。
