import { describe, expect, it } from 'vitest';
import { deleteConfirmSpec } from './deleteSelection';

describe('Delete 確認文案', () => {
  it('單數 / 複數 / 帶名字 / 帶兩個數', () => {
    expect(deleteConfirmSpec({ kind: 'persons', n: 1 })).toEqual({ key: 'confirm.deletePerson' });
    expect(deleteConfirmSpec({ kind: 'persons', n: 3 })).toEqual({ key: 'confirm.deletePersons', vars: { n: 3 } });
    expect(deleteConfirmSpec({ kind: 'lines', n: 8 })).toEqual({ key: 'confirm.deleteLines', vars: { n: 8 } });
    expect(deleteConfirmSpec({ kind: 'units', n: 1 })).toEqual({ key: 'confirm.deleteUnit' });
    expect(deleteConfirmSpec({ kind: 'personsUnits', n: 2, m: 1 })).toEqual({ key: 'confirm.deletePersonsUnits', vars: { n: 2, m: 1 } });
    expect(deleteConfirmSpec({ kind: 'ecosystem', n: 1, name: '學校' })).toEqual({ key: 'confirm.deleteNamed', vars: { name: '學校' } });
    expect(deleteConfirmSpec({ kind: 'household', n: 1 })).toEqual({ key: 'confirm.deleteHousehold' });
    expect(deleteConfirmSpec({ kind: 'connector', n: 1 })).toEqual({ key: 'confirm.deleteConnector' });
  });
});
