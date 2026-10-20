// The pure wording in each language: dates, balance, budgets, settle-up and chart axes read naturally.
import { describe, expect, it } from 'vitest';
import { de } from '../../i18n/de';
import { en } from '../../i18n/en';
import { balanceBasis, balanceHeadline, expenseEffectLabel } from '../balance';
import { daysLeftLabel, monthBudgetLine } from '../budgets';
import { shareLabel } from '../coupleSettings';
import { dateLabels } from '../dates';
import { formatMoneyCompact } from '../money';
import { paidSentence, settleLead } from '../settle';

const today = new Date(2026, 9, 18); // Sunday 18 Oct 2026
const diego = { id: 'diego', name: 'Diego' };
const ana = { id: 'ana', name: 'Ana' };

describe('dates', () => {
  const enD = dateLabels(en.dates);
  const deD = dateLabels(de.dates);

  it('English: Oct 12 · Monday, October 12 · Oct 13 – 19 · Sep 28 – Oct 4 · October 2026', () => {
    expect(enD.shortDate('2026-10-12')).toBe('Oct 12');
    expect(enD.longDate('2026-10-12', today)).toBe('Monday, October 12');
    expect(enD.longDate('2026-10-18', today)).toBe('Today, Oct 18');
    expect(enD.dayHeading('2026-10-17', today)).toBe('Yesterday');
    expect(enD.weekLabel('2026-10-12')).toBe('Oct 12 – 18');
    expect(enD.weekLabel('2026-09-28')).toBe('Sep 28 – Oct 4');
    expect(enD.monthLabel('2026-10')).toBe('October 2026');
  });

  it('German: 12. Okt. · Montag, 12. Oktober · 12.–18. Okt. · Oktober 2026', () => {
    expect(deD.shortDate('2026-10-12')).toBe('12. Okt.');
    expect(deD.longDate('2026-10-12', today)).toBe('Montag, 12. Oktober');
    expect(deD.chipDate('2026-10-18', today)).toBe('Heute');
    expect(deD.weekLabel('2026-10-12')).toBe('12.–18. Okt.');
    expect(deD.weekLabel('2026-09-28')).toBe('28. Sept. – 4. Okt.');
    expect(deD.monthLabel('2026-03')).toBe('März 2026');
    expect(deD.weekdayInitials).toEqual(['M', 'D', 'M', 'D', 'F', 'S', 'S']);
  });
});

describe('balance', () => {
  it('English', () => {
    expect(balanceHeadline(337_950, 'Ana', en)).toBe('Ana owes you');
    expect(balanceHeadline(-1, 'Ana', en)).toBe('You owe Ana');
    expect(balanceBasis(9, 1, en)).toBe('Includes 9 shared expenses and 1 recorded payment');
    expect(expenseEffectLabel({ paidBy: 'diego', amountMinor: 285_000, splitMode: 'half' }, 'diego', 'COP', en).text).toBe('You’re owed $142.500');
  });

  it('German', () => {
    expect(balanceHeadline(0, 'Ana', de)).toBe('Ihr seid quitt');
    expect(balanceBasis(1, 2, de)).toBe('Berücksichtigt 1 gemeinsame Ausgabe und 2 erfasste Zahlungen');
    expect(expenseEffectLabel({ paidBy: 'ana', amountMinor: 240_000, splitMode: 'half' }, 'diego', 'COP', de).text).toBe('Du schuldest $120.000');
  });
});

describe('budgets, settle-up and settings', () => {
  it('keeps German nouns capitalised in the month header', () => {
    expect(de.budgetsScreen.monthHeader('Oktober', daysLeftLabel(13, de))).toBe('Oktober · noch 13 Tage');
    expect(en.budgetsScreen.monthHeader('October', daysLeftLabel(13, en))).toBe('October · 13 days left');
  });

  it('says the budget state in words', () => {
    expect(monthBudgetLine(850, 1_000, 'COP', en)).toBe('Heads up: $150 left this month');
    expect(monthBudgetLine(1_200, 1_000, 'COP', de)).toBe('Diesen Monat $200 über dem Limit');
  });

  it('settles up in each language', () => {
    expect(settleLead(ana, diego, 337_950, 'COP', en)).toBe('Ana pays Diego. Outstanding: $337.950');
    expect(paidSentence('Ana', 'Diego', 300_000, 'transfer', 'COP', de)).toBe('Ana hat Diego $300.000 per Überweisung bezahlt.');
    expect(shareLabel(65, 'Ana', de)).toBe('Du 65 % · Ana 35 %');
  });

  it('shortens axis amounts with the language’s words; US$ keeps K / M', () => {
    expect(formatMoneyCompact(200_000, 'COP', de.money)).toBe('$200 Tsd.');
    expect(formatMoneyCompact(1_500_000, 'COP', en.money)).toBe('$1,5 M');
    expect(formatMoneyCompact(120_000, 'EUR', de.money)).toBe('1,2 Tsd. €');
    expect(formatMoneyCompact(250_000, 'USD', de.money)).toBe('US$2.5K');
  });
});
