# Miscellaneous Assets

このフォルダは、内容を確認済みだが既存の正式カテゴリに安全に分類できない Monster Quest 0 関連素材を保管する場所です。

`assets/_inbox/` との違い:

- `_inbox/`: 未確認・未判定の一時置き場
- `misc/`: 内容確認済みだが、title / characters / monsters / maps / battle / ui / cards / promo / audio のどれにも自然に属さない保管対象

## 運用ルール

- 実装で直接参照する素材は、可能な限り正式カテゴリへ移す
- `misc/` 内の素材は原則 `REFERENCE` 扱いとする
- ファイル名は半角英数字 + `_` の `snake_case`
- 用途が分かった時点で正式カテゴリへ移動し、`docs/ASSET_INDEX.md` を更新する
- 原本・参考資料・途中案を混在させる場合は、ファイル名またはサブフォルダで用途を明示する

例:

```text
assets/misc/
├─ reference/
├─ concept/
└─ archive/
```
