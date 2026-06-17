import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  COMFORT_COLOR,
  getComfortLevel,
  levelToOpacity,
  onComfortChange,
} from '../../services/eyeComfort';

/**
 * 全域暖色遮罩。固定鋪滿視窗、不吃點擊(pointerEvents:none)、
 * multiply 疊在所有內容之上(含對話框,符合「全域」需求)。
 *
 * 用 portal 掛到 document.body —— 跟對話框同層,才保證能蓋過它們去 blend。
 * 只影響「螢幕看到的」,不進匯出(見 services/eyeComfort.ts 說明)。
 */
export default function EyeComfortOverlay() {
  const [level, setLevel] = useState(getComfortLevel());

  useEffect(() => onComfortChange(setLevel), []);

  const opacity = levelToOpacity(level);
  if (opacity <= 0) return null;

  return createPortal(
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 2147483000,
        mixBlendMode: 'multiply',
        background: COMFORT_COLOR,
        opacity,
      }}
    />,
    document.body,
  );
}
