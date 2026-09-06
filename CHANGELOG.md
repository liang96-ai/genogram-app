# 更新紀錄 / Changelog

給使用者看的版本說明。技術細節請見 git 歷史。
User-facing release notes; see git history for technical details.

## 1.5.0 — 2026-09-07

**English summary:** Quick-add never moves people you already placed (plus a "tidy children row" command); household circles now behave exactly like ecosystems (edit handles, rename, delete); marriage lines that would pass through other people now route underneath with small hops at line crossings, a draggable bar height, and a "move spouses to the near ends" helper; the four quick arrows can be long-pressed and dragged onto people or marriage lines to marry, attach parents, or attach children.

### 改了什麼
- **新增不再搬人**:按快捷箭頭加子女、雙胞胎、配偶,只放新的人,既有的人一個都不動;新的人接在同一排尾端,撞到別人自己讓。選單多了「**整理子女排列**」,想排整齊自己按,一步可復原。
- **同住圈和生態圈同一套操作**:點邊線選取、雙擊進編輯拖邊拖角、雙擊標籤改名、紅 × 或 Delete 解除,兩種圈一模一樣。同住圈一開始自動包住成員,拖過把手後固定形狀;復原可回到自動。
- **跨家族的婚姻線不再穿過人**:直線會穿過別人的婚姻線自動改走 U 型,橫桿落到沒有人的那一層;和別的線交叉的地方鼓一個小弧「跳過去」。選取婚姻線後可拖橫桿高度;選單多了「**把配偶移到靠近對方的那一端**」,按了才動、一步可復原。
- **四個箭頭可以長按拖曳**:短按照舊;長按 0.25 秒後拖到人物或婚姻線 —— 左右拖到人是結婚,上拖到人是對方成為父母、拖到婚姻線是那對夫妻成為父母,下拖到人是對方成為子女。放在空白處或不合理的目標(自己、已有線、會變成自己的祖先)什麼都不做。
- 上箭頭拖到人的意思改成「對方成為我的父母」(原本是我成為對方的父母),與拖到婚姻線的意思一致。

### 幕後
- 檔案格式只新增選填欄位(同住圈自訂形狀、婚姻線橫桿偏移),舊檔照讀。
- 新增 30 條單元測試與 2 條使用者旅程(同住圈編輯、箭頭拖曳結婚),共 252 單元、15 旅程。

## 1.4.0 — 2026-09-03

**English summary:** One modal shell for all 17 dialogs (stacking, Escape and background-lock guaranteed by a single stack), one text-input strategy (draft fields: 0.8 s idle / blur / before-save / unmount, one input session = one undo step), selection exclusivity defined in one place, every delete gesture is one undo step, the update banner now always reloads, unified wording on free use vs. voluntary support vs. commercial licensing, brochure updated.

### 手感統一
- **所有彈窗同一套外殼**:17 個視窗開、關、Esc 的行為一致;兩層疊著按 Esc 只關最上面那層;彈窗開著時底下的畫布與面板一律不接受鍵盤與點擊(用瀏覽器原生的 inert)。
- **文字輸入同一套機制**:姓名、備註、訪談筆記、事件標題與描述都是「草稿欄位」:停手 0.8 秒、離開欄位、存檔前、切換分頁時結算;一次輸入不論停頓幾次都只吃一格復原;中文輸入法組字期間不寫入。
- **選取同一套規則**:一次只能選一種東西,互斥由單一定義保證,不再靠每個動作各自清欄位。
- **刪除同一套規則**:按 Delete 刪什麼、問什麼、怎麼刪,只定義在一處;多選線條或機構長條一起刪也是一步復原(以前刪 8 條線要按 8 次復原)。
- **「立即更新」一定會刷新**:按下後橫幅立刻收起;背景更新機制沒在 2.5 秒內重整就自己重整一次。

### 文案與文件
- 使用本工具對個人與機構都免費;支持是自願的;只有把工具嵌進封閉產品、SaaS 或系統整合才需要商業授權。關於頁、README、贊助說明、推廣手冊改成同一種說法。
- 隱私聲明新增「哪裡會出現姓名」分層表(檔名、匯出內容、圖片、備份資料夾、目錄檔、回報信、分享連結各自的規則)。
- 推廣手冊補上 1.3 的功能(時間軸、同住圈、復原 20 步、搜尋、備份提醒)與「交接與備份」一節;量表數更新為 14。

### 幕後
- 復原的「一格是什麼」只定義在 store 一處(時間窗 + 輸入 session 兩條規則),五個更新動作都走同一個判斷。
- 新增旅程測試:草稿欄位一次輸入一格復原、兩層彈窗 Esc 只關上層;單元測試新增草稿 session、彈窗堆疊、選取互斥、批次刪除、更新重載保底。
- 彈窗外殼沒有採用原生 dialog 的 top layer:它會壓在護眼濾鏡與系統警示橫幅之上;改用 portal + 堆疊 + inert 達到同樣的三個保證。

## 1.3.1 — 2026-09-03

**English summary:** Fourth tab renamed to "Case records" with an "Assess" button; Barthel Index bands corrected to the official scheme; opening a case no longer rewrites the backup folder or counts as an edit; a newer version found in the backup folder now asks before anything is overwritten; "folder sync" wording replaced by "folder backup"; tutorial updated; golden tests for all 14 scales and a frozen reference case for the file-format contract.

### 改了什麼
- 右側第四分頁改名為「**個案紀錄**」(原「附件存放」):量表分數、訪談筆記、重大事件時間軸、附件都在這裡;量表區塊旁新增「**施測**」按鈕,不用再回選單找「評估工具」。
- **巴氏量表分級修正**為衛福部 / Shah 五級:100 完全獨立、91-99 輕度依賴、61-90 中度依賴、21-60 嚴重依賴、0-20 完全依賴。舊版把 21-60 拆成 41-60 中度 / 21-40 嚴重,與官方不符。已存的分數與答案不變;舊紀錄的等級文字會在下次開啟該個案時依新分級重算,同一位個案的新舊紀錄不會互相矛盾。
- **開啟個案不再算作編輯**:只是打開看一眼,不會重寫備份資料夾裡的檔案,也不會計入備份提醒的編輯次數。
- **備份資料夾裡有較新的版本時會先問你**(兩台電腦共用 iCloud / Dropbox 資料夾的情境):顯示兩邊的修改時間,由你決定用資料夾的版本還是保留這台的;兩個選擇各自的後果都寫在對話框上,同一個版本只問一次。
- 用詞統一:「資料夾同步」改為「**資料夾備份**」。本工具不做雙向同步,資料庫永遠是真相,資料夾是單向備份(規則寫在 docs/STORAGE.md)。
- 教學補上第四分頁新名稱、圈成同住、首頁搜尋、復原 20 步、備份提醒。

### 幕後
- 14 個量表的臨床切點全部有「對答案」測試(來源標官方文件),巴氏量表的錯就是這樣抓到的。
- 凍結一份夾帶未知欄位的參考個案,每次測試都驗證「匯入 → 編輯 → 匯出」未知欄位原樣保留;日後給 iOS 版當兩端合約。
- 版本判斷收成一個函式,匯入與資料夾救援都走它;資料夾裡未來 2.x 格式的檔案不會被舊版靜默讀進資料庫。
- 「做完」的定義寫進 docs/VERIFY.md,六項全在 `npm run verify`:lint、建置、外連網域白名單、本機哨兵、單元測試、11 條使用者旅程(新增「施測」入口)。
- 更新紀錄改由本檔(CHANGELOG.md)承載;版權聲明移到 COPYRIGHT,LICENSE 維持 AGPL-3.0 純文字。

## 1.3.0 — 2026-09

**English summary:** Major-event timeline, household circles you can select and dissolve, SVG export, case search, backup reminder, edit-level undo (limit 5 → 20), safer import/rescue chain, end-to-end automated acceptance (10 user journeys), 1,138 lines of dead code removed. Export filenames no longer include the client's name (deliberate privacy change).

### 新功能
- **重大事件時間軸**(在右側第四分頁):結婚、離婚、過世、安置、搬家……一筆一筆記日期、類型、標題、描述與牽涉到的家人;由舊到新排列,喜事綠、變故紅、遷轉橘。
- **圈成同住**:框選 2 個人以上,畫布上方會浮出「圈成同住」按鈕;點圈的邊線可以選取它,按紅 × 或 Delete 解除(成員不會被刪除);同一群人不會被重複圈兩次。
- **SVG 向量匯出**:貼進 Word 報告放大不會糊。
- **首頁個案搜尋**。
- **量表可記「受測者」**;存檔後告訴你存到哪一頁;列表顯示測過幾次;刪紀錄會先確認。
- **鍵盤精修排版**:選了人物按方向鍵一次移一格,Cmd/Ctrl+A 全選;縮放上限 100% → 200%。
- **備份提醒**:沒有設定備份資料夾的裝置(iPad、Firefox),超過 14 天沒做全備份又有新編輯時,開啟時溫和提醒一次;純本機記錄、零外連。

### 更順手了
- 復原(Ctrl+Z)改成「一次編輯算一步」:在右欄打一段字不再一個字吃掉一步,也不會洗掉畫布的排版歷史;上限 5 步 → 20 步。
- 量表、快速建立填到一半,不小心按 Esc、點到外面或 ✕,會先問你要不要放棄;符號圖例、學術引用、資料夾設定三個視窗也能按 Esc 關。
- 圖片匯出記住你上次選的格式、解析度、範圍、隱藏選項。
- 新個案一進畫布,案主就是選取狀態。
- 框選同時圈到人物和機構長條,按 Delete 會一起刪,一步就能復原。
- 保密欄位的勾選會記住,重開不歸零;畫布角落常駐「遮蔽中 · N 個欄位」提示。
- 匯入更聰明:選錯檔會用人話告訴你;個案衝突時列出兩邊的日期與人數;不再把所有個案的「最後修改」改成今天;匯入成功的個案立刻寫進備份資料夾。
- 「選資料夾」選完立刻掃回資料夾裡的個案,並告訴你救回幾筆。
- 備份資料夾根目錄有一份人看得懂的「_目錄.txt」。
- 教學文案跟上目前的選單位置,並介紹「快速建立」。
- 英文模式補齊:刪除確認、工具列、載入畫面、資料夾設定、備份成功訊息、量表分類全部有英文。
- 隱私說明頁提醒「共用電腦請一人一個帳號」;匯出前的個資警語補上交接建議。

### 修正
- 教學或任何彈窗開著時,按方向鍵/Delete 會穿透到畫布把人物移走(1.3 開發中引進,上線前修正)。
- 同一群人可以圈出兩個完全重疊的同住圈。
- 事件類型一旦設定就清不回空白。
- 時間軸遇到壞資料會當機、或「刪除人物永遠沒反應」:匯入時自動修復並告知「修復 N 筆」,壞資料不會覆蓋你資料夾裡的原檔。
- 匯入 1.x 系列的檔案不再因小版號不同被拒收。
- 回饋信裡的 App 版本號寫死為 1.0。
- **匯出檔名預設改為「家系圖_日期_N人」,不再含案主名**:刻意的隱私改變,要有名字請存檔時自己改。

### 幕後
- 移除含版權疑慮、從未啟用的 MMSE 量表檔。
- 清掉 1,138 行從沒被執行到的程式碼。
- 全備份補齊教育/族裔/宗教/障別四種輸入歷史,換機還原後慣用選項跟著走。
- 資料格式版本規則白紙黑字(docs/VERSIONING.md):1.x 一律試讀、未知欄位原樣保留、只有 2.x 才拒收。
- 端到端自動驗收:10 條真實使用者旅程一行指令跑完;單元測試 124 → 176;lint 納入驗收閘門。
- 「段落切分器」原型(把一整段訪視敘述切成快速建立吃得下的一行一人),尚未接進介面。

## 1.2.2 與更早

尚未整理成本檔;請見 git 歷史。
