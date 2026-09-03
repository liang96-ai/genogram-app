#!/bin/sh
# 本機才有的檢查(不進 repo 的 .claude/ 目錄):有檔就跑,沒有就略過。
if [ -f .claude/check-watermark.sh ]; then sh .claude/check-watermark.sh; else echo "(no local checks)"; fi
