# 法規亦毒氣

此瀏覽器外掛
可將網頁中的法規、條文、大法官解釋加上連結，並可於同一頁面瀏覽其內容；
並對全國法規資料庫與立法院法律系統的網頁進行排版調整。


## 相關連結

* [Chrome 擴充功能安裝](https://chrome.google.com/webstore/detail/iedodmlnmhobigohbkalkkjlbmdkjalj)
* [Firefox 附加元件安裝](https://addons.mozilla.org/zh-TW/firefox/addon/laweasyread/)
* Edge 可由前述 Chrome Store 的連結安裝擴充功能。
* Opera 延伸套件：
  1. 先安裝 Opera 官方套件 [Install Chrome Extensions](https://addons.opera.com/en/extensions/details/install-chrome-extensions/)
  2. 即可由前述 Chrome Store 的連結安裝擴充功能。
* [更新紀錄](changelog.md)
* [開發文件](README-dev.md)


## 功能示範

安裝後再瀏覽立法院法律系統：
![立法院法律系統使用成效](https://g0v.github.io/laweasyread-front/images/demo_lis.ly.png)

安裝後再瀏覽全國法規資料庫：
![全國法規資料庫使用成效](https://g0v.github.io/laweasyread-front/images/demo_moj.png)


### 「列出本頁所有法律資料」功能

可在頁面右方列出當前頁面提到的法條與釋字，例如：
![大法官解釋使用成效](https://g0v.github.io/laweasyread-front/images/demo_constitutionalcourt.png)


## 手動安裝

### 瀏覽器外掛

1. 在[發布頁面](https://github.com/g0v/laweasyread-front/releases)下載所需版本，並解壓縮之。
2. 進入瀏覽器的「擴充功能」設定頁面。
3. 開啟「開發人員模式」。
4. 點選「載入為封裝項目」，尋找步驟一解壓縮後的檔案路徑。


## 使用說明

* 僅針對收錄於[全國法規資料庫](https://law.moj.gov.tw/)的法規。
* 頁面較複雜或資料較多時，不會瞬間轉換完畢。
* 法條連結均連向最新版的條文，因此瀏覽較舊的文章或判決時務必留意條文可能已經變更。
* 法規名稱、法條內文的更新會晚於全國法規資料庫兩週左右。


### 隱私權政策

本程式會：
* 將您的使用設定存在您的電腦中
* 讓您的瀏覽器對第三方網站 `cdn.jsdelivr.net` 進行連線。
  該站是紐約時報也信任的網站服務，因此可以放心，或是親自查閱[他們的隱私權政策](https://www.jsdelivr.com/privacy-policy-jsdelivr-net)。

除了前述網站，本程式不會將您的任何資料傳送給任何人或機構。
