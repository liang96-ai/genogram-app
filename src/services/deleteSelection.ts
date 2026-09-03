// 「按 Delete 要刪什麼、要不要先問、問什麼」的唯一定義(2026-09-03 統一)。
// store.describeDeletable() 說「選的是哪一種、幾個」;這裡把它換成確認框文案;
// store.deleteSelected() 負責真的刪(每一種都是一步復原)。
export type DeletableKind =
  | 'household'
  | 'personsUnits'
  | 'persons'
  | 'lines'
  | 'units'
  | 'ecosystem'
  | 'connector';

export type Deletable = { kind: DeletableKind; n: number; m?: number; name?: string };

export type ConfirmSpec = { key: string; vars?: Record<string, string | number> };

/** 確認框要問什麼(i18n key + 變數) */
export function deleteConfirmSpec(d: Deletable): ConfirmSpec {
  switch (d.kind) {
    case 'household':
      return { key: 'confirm.deleteHousehold' };
    case 'personsUnits':
      return { key: 'confirm.deletePersonsUnits', vars: { n: d.n, m: d.m ?? 0 } };
    case 'persons':
      return d.n === 1 ? { key: 'confirm.deletePerson' } : { key: 'confirm.deletePersons', vars: { n: d.n } };
    case 'lines':
      return d.n === 1 ? { key: 'confirm.deleteLine' } : { key: 'confirm.deleteLines', vars: { n: d.n } };
    case 'units':
      return d.n === 1 ? { key: 'confirm.deleteUnit' } : { key: 'confirm.deleteUnits', vars: { n: d.n } };
    case 'ecosystem':
      return { key: 'confirm.deleteNamed', vars: { name: d.name ?? '' } };
    case 'connector':
      return { key: 'confirm.deleteConnector' };
  }
}
