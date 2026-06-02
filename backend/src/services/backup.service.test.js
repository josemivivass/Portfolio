const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { backupFilename } = require('./backup.service');

describe('backupFilename', () => {
  test('formatea el nombre como Backup_DD-MM-YYYY_HHhMM.sql', () => {
    // 2 de junio de 2026, 09:07 (mes 5 = junio, 0-indexado)
    const date = new Date(2026, 5, 2, 9, 7);
    assert.equal(backupFilename(date), 'Backup_02-06-2026_09h07.sql');
  });

  test('rellena con ceros días, meses, horas y minutos', () => {
    const date = new Date(2026, 0, 5, 3, 4);
    assert.equal(backupFilename(date), 'Backup_05-01-2026_03h04.sql');
  });
});
