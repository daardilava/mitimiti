// Monthly limits per category. RLS lets members read and write their own couple's rows; Realtime carries them to
// the partner. Setting a limit writes the row for this month, which then holds for later months too.
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BudgetRow } from '@/lib/budgets';
import { sampleBudgets } from '@/lib/sample';
import { DEV_BYPASS_AUTH, useSessionStore } from '@/lib/session';
import { supabase } from '@/lib/supabase';
import type { CategoryId } from '@/ui/tokens';

export const budgetKeys = { all: ['budgets'] as const };

export async function listBudgets(): Promise<BudgetRow[]> {
  if (DEV_BYPASS_AUTH) return sampleBudgets.map((b) => ({ ...b }));
  const { data, error } = await supabase.from('budgets').select('category, month, limit_minor').order('month');
  if (error) throw error;
  return (data as { category: CategoryId; month: string; limit_minor: number | string }[]).map((r) => ({
    category: r.category,
    month: r.month,
    limitMinor: Number(r.limit_minor),
  }));
}

/** `month` is YYYY-MM-01. A limit of 0 means "no limit" from that month on. */
export async function setBudget(input: BudgetRow): Promise<void> {
  if (DEV_BYPASS_AUTH) {
    const i = sampleBudgets.findIndex((b) => b.category === input.category && b.month === input.month);
    if (i >= 0) sampleBudgets[i] = { ...input };
    else sampleBudgets.push({ ...input });
    return;
  }
  const { householdId } = useSessionStore.getState();
  if (!householdId) throw new Error('not_in_household');
  const { error } = await supabase
    .from('budgets')
    .upsert({ household_id: householdId, category: input.category, month: input.month, limit_minor: input.limitMinor }, { onConflict: 'household_id,category,month' });
  if (error) throw error;
}

export function useBudgets() {
  return useQuery({ queryKey: budgetKeys.all, queryFn: listBudgets });
}

/** Optimistic: the new limit shows at once; on failure the list goes back to what the server has. */
export function useSetBudget() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: setBudget,
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: budgetKeys.all });
      client.setQueryData<BudgetRow[]>(budgetKeys.all, (rows = []) => {
        const rest = rows.filter((r) => !(r.category === input.category && r.month === input.month));
        return [...rest, input];
      });
    },
    onSettled: () => client.invalidateQueries({ queryKey: budgetKeys.all }),
  });
}
