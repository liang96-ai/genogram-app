# 更新紀錄 / Changelog

給使用者看的版本說明。技術細節請見 git 歷史。
User-facing release notes; see git history for technical details.

## 1.6.0 — 2026-09-30

**English summary:** A calmer, clearer interface. First launch is a single welcome card instead of four dialogs, and a one-minute walkthrough teaches the tool on your own case (add parents, add a spouse or child, fill a detail, quick build, export). The old 12-step tutorial became a Manual. Quick Build now fills in education: school names, levels, grades, and whether the person graduated, is attending, or dropped out. Emoji icons were replaced by one set of line icons; the home header keeps only the menu, eye comfort, language, and the privacy badge; the side panel folds rarely used fields under “More details”; undo and redo sit on the bottom bar; an empty canvas offers two ways to start. This release also includes the data-safety fixes: renaming a case is no longer reverted by undo; choosing a backup folder from the attachments tab now asks which version to keep when the folder has a newer copy; full reset asks whether to delete the case folders in the backup folder too (your own backups and files are never touched); adding a child to someone who is cohabiting or widowed no longer creates a new spouse; Quick Build recognizes more ways to say someone has died; adding grandparents on both sides keeps all four on the same generation row; exported images no longer include overlap warnings; an interrupted press on the marriage-line arrow no longer adds a child.

### 介面與教學
- **第一次打開只有一張歡迎卡。** 隱私說明濃縮成三句,按「開始第一個個案」直接進畫布;以前要先過隱私、選資料夾、取名字、12 步教學四關。
- **帶著做一次。** 在你自己的個案上,一步一個真的動作:加爸媽、加配偶或小孩、填一個年齡、快速建立、匯出圖片。做到了自動下一步;已經會的直接按「下一步」。約一分鐘,隨時可跳過,之後從選單重看。
- **快速建立認得學歷。** 學校名稱(台灣大學、光明國小、護專)、程度(高中、碩士)、年級(國一、國小三年級、大班)、日常說法(高中生、國中畢、讀高一),連同畢業、在學、肄業、休學,直接填進教育程度。以前「國一」「高中生」會被當成名字,「台灣大學」會變備註。
- **支持頁重寫**,說明綠界是台灣的金流公司、付款只在綠界或 Ko-fi 的頁面完成。
- **原本的 12 步教學變成「說明手冊」**,從選單按頁查。
- **介面圖示改成一套線條圖示**,取代 emoji;電腦、iPad 顯示一致。
- **首頁上排只留選單、護眼、語言和隱私徽章**;資料夾、分享、安裝、回報、支持收進選單,每個都有文字。修正主選單在電腦螢幕上左邊被切掉。標題換成 App 的標誌。
- **沒設備份資料夾時,改成一行小字提醒**,不再是每次都在的橘色警告;新增個案時選資料夾的彈窗只問一次。
- **右側面板:職業以外的個人資訊收進「更多資料」**,已經填過的會自動展開,一格都沒刪。看不懂的名稱改成白話:案主塗黑、民國年、更多符號(醫療、性別與標記、遺傳)。「新增人物」獨立成有字的按鈕。
- **復原、重做放到底部縮放列**,iPad 沒鍵盤也一按就到。
- **空白畫布出現起步卡**:用箭頭加家人,或打字快速建立。
- **個案名稱旁有一支筆**,點一下就能改名。工具列不再常駐「支持」,改放選單。
- 選單的「輸出檔案」不再有一個紅字。


### 資料安全修正
- **改名後按復原,名字不再變回舊的。** 以前改完個案名稱再按一次復原,整份個案會退回改名前,舊名字還會被自動存回去。
- **在附件分頁設定備份資料夾,也會先問「資料夾裡的版本比較新」。** 以前只有個案清單會問,附件分頁不問,之後自動存檔可能蓋掉另一台電腦的新版。選了「用資料夾的版本」後,正在編輯的畫面也會換成新的;在個案清單改名也不會再把它蓋回舊版。
- **「全部重置」會問要不要一起刪除備份資料夾裡的個案檔。** 以前資料夾裡的檔案留著,之後再選同一個資料夾,刪過的個案會被救回來。只刪本工具建立的個案資料夾和目錄檔;你用「備份」存的全備份、資料夾裡你自己的檔案都不會動。資料夾權限暫時失效時也會問。
- **同居、喪偶、分居的人按「加子女」,不再多生出一個新配偶。** 以前只認得舊版的線型名稱。
- **快速建立認得「身故」「離世」,整段描述認得「已故」。** 以前打「爸爸 身故」會被畫成在世。
- **同時加父系和母系祖父母,四位排在同一排。** 以前外公外婆會被擠到高一層,還掛著橘色警示。
- **匯出的圖片不再帶出警示。** 橘色重疊圈、紅色的線是編輯時給你看的,不屬於家系圖。
- **按婚姻線下方箭頭時被系統打斷,不再誤加子女或多胞胎。**

### 看不到但比較穩的地方
- 「哪些線算親子、哪些算婚姻」收成一處,快速建立的預覽和實際畫出來的結果不會再對不上。
- 新增 iPad 的使用者旅程測試(Safari 核心、觸控),iPad 上 16 條旅程通過;備份資料夾相關的兩條本來就只有電腦版有。
- 新增「全部重置只刪個案資料夾」和「第一次打開到快速建立」兩條使用者旅程,電腦版共 18 條。

## 1.5.1 — 2026-09-07

**English summary:** Household circles can go back to auto-wrapping their members (select → ↺), and a manually shaped circle is drawn dash-dot so you can tell it no longer follows people; double-click the marriage-line handle to reset its height; long-pressing an arrow without dragging now counts as a tap; the canvas suppresses the iOS long-press menu; exporting an image while editing a household no longer includes the handles.

### 改了什麼
- **同住圈可以回到自動**:選取後按 ↺,圈重新自動包住成員,一步可復原。調整過形狀的圈改畫點虛線,一看就知道它不會再跟著成員走。
- **婚姻線高度雙擊回到自動**:選取婚姻線後雙擊橫桿把手,手動高度取消,一步可復原。
- **長按沒拖動就放開,視同短按**:四個箭頭一致,不會再出現「按了沒反應」。
- **iPad 長按不再跳出系統選單**。
- **修正**:編輯同住圈時匯出圖片,不再把把手畫進圖裡。

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
