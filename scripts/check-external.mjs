// 建置產物外連網域白名單檢查 —— 「永不上傳」的機器防線。
// 本工具沒有任何對外請求;產物裡出現的網址只允許是「可點的連結」(量表官方頁、抖內、GitHub)。
// 出現不在名單上的網域就失敗,逼人先來這裡說明它是什麼。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ALLOW = new Set([
  'www.w3.org', // SVG / XML 命名空間字串,不是請求
  'genogram.liang96.workers.dev', // 自己的網址(分享文案)
  'github.com', 'ko-fi.com', 'p.ecpay.com.tw', 'bit.ly', 'tinyurl.com', // 連結:原始碼 / 支持
  'react.dev', // React 開發版錯誤訊息連結
  // 量表官方來源連結(ScaleDialog 上方「來源」)
  'www.phqscreeners.com', 'dep.mohw.gov.tw', 'www.who.int', 'www.tsos.org.tw', 'www.tsgh.ndmctsgh.edu.tw',
  'www.sfaa.gov.tw', 'www.ptsd.va.gov', 'www.facesiv.com', 'www.cdc.gov', 'knightadrc.wustl.edu',
  'eprovide.mapi-trust.org', 'crafft.org', '1966.gov.tw',
]);

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|html|css|webmanifest)$/.test(n)) out.push(p);
  }
  return out;
}
const found = new Map();
for (const f of walk('dist')) {
  const text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/https?:\/\/([A-Za-z0-9.-]+)/g)) {
    const host = m[1].toLowerCase();
    if (!found.has(host)) found.set(host, f);
  }
}
const unknown = [...found.keys()].filter((h) => !ALLOW.has(h));
if (unknown.length) {
  console.error('❌ 建置產物出現不在白名單的網域:');
  for (const h of unknown) console.error(`   ${h}  ← ${found.get(h)}`);
  console.error('   若是新的合法連結,把它加進 scripts/check-external.mjs 的 ALLOW 並說明用途。');
  process.exit(1);
}
console.log(`✓ 外連網域檢查:${found.size} 個網域全在白名單(全部是連結,無任何請求)`);
