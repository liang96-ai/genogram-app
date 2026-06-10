// pinyin-match 套件只附主入口(簡體字典)的型別宣告;
// 繁體字典子路徑(#121 改用,「憂鬱症」等繁體詞才查得到)沿用同一組 API。
declare module 'pinyin-match/es/traditional' {
  import Pinyin from 'pinyin-match';
  export default Pinyin;
}
