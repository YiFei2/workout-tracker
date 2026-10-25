import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

import {
  addManualTransaction,
  completeTask,
  createReward,
  createTask,
  deleteReward,
  deleteTask,
  deleteTransaction,
  getBalance,
  listRewards,
  listTasks,
  listTransactions,
  redeemReward,
  undoLastTaskCompletion,
  updateReward,
  updateTask,
  type NewTaskInput,
  type RewardPatch,
  type TaskPatch,
} from "../db";
import type { PointsTransaction, Reward, Task } from "../types";

interface RewardsContextValue {
  balance: number;
  tasks: Task[];
  rewards: Reward[];
  transactions: PointsTransaction[];
  loading: boolean;
  refresh: () => Promise<void>;
  // Tasks
  addTask: (input: NewTaskInput) => Promise<void>;
  editTask: (id: string, patch: TaskPatch) => Promise<void>;
  removeTask: (id: string) => Promise<void>;
  markTaskComplete: (id: string) => Promise<void>;
  undoTaskCompletion: (id: string) => Promise<void>;
  // Rewards
  addReward: (name: string, cost: number) => Promise<void>;
  editReward: (id: string, patch: RewardPatch) => Promise<void>;
  removeReward: (id: string) => Promise<void>;
  redeem: (id: string) => Promise<void>;
  // Ledger
  addManual: (amount: number, note: string | null) => Promise<void>;
  removeTransaction: (id: string) => Promise<void>;
}

const RewardsContext = createContext<RewardsContextValue | null>(null);

// Single shared store for the whole points economy: balance, tasks, rewards,
// and the ledger. All three Rewards surfaces (Tasks / Store / Points history)
// read from here so a credit or debit made on one is reflected everywhere at
// once — the same rationale as LocationsContext. Because workout completion
// can credit points from outside this module, the Rewards screens also call
// refresh() on focus (see the screens' useFocusEffect).
export function RewardsProvider({ children }: { children: ReactNode }) {
  const [balance, setBalance] = useState(0);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [transactions, setTransactions] = useState<PointsTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [nextBalance, nextTasks, nextRewards, nextTransactions] = await Promise.all([
        getBalance(),
        listTasks(),
        listRewards(),
        listTransactions(),
      ]);
      setBalance(nextBalance);
      setTasks(nextTasks);
      setRewards(nextRewards);
      setTransactions(nextTransactions);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = useCallback(
    (op: () => Promise<void>) => async () => {
      await op();
      await refresh();
    },
    [refresh],
  );

  const addTask = useCallback((input: NewTaskInput) => run(() => createTask(input))(), [run]);
  const editTask = useCallback(
    (id: string, patch: TaskPatch) => run(() => updateTask(id, patch))(),
    [run],
  );
  const removeTask = useCallback((id: string) => run(() => deleteTask(id))(), [run]);
  const markTaskComplete = useCallback((id: string) => run(() => completeTask(id))(), [run]);
  const undoTaskCompletion = useCallback(
    (id: string) => run(() => undoLastTaskCompletion(id))(),
    [run],
  );

  const addReward = useCallback(
    (name: string, cost: number) => run(() => createReward(name, cost))(),
    [run],
  );
  const editReward = useCallback(
    (id: string, patch: RewardPatch) => run(() => updateReward(id, patch))(),
    [run],
  );
  const removeReward = useCallback((id: string) => run(() => deleteReward(id))(), [run]);
  // redeemReward can throw InsufficientPointsError; let it propagate to the
  // caller (the Store screen) but still refresh afterward via finally.
  const redeem = useCallback(
    async (id: string) => {
      try {
        await redeemReward(id);
      } finally {
        await refresh();
      }
    },
    [refresh],
  );

  const addManual = useCallback(
    (amount: number, note: string | null) => run(() => addManualTransaction(amount, note))(),
    [run],
  );
  const removeTransaction = useCallback(
    (id: string) => run(() => deleteTransaction(id))(),
    [run],
  );

  return (
    <RewardsContext.Provider
      value={{
        balance,
        tasks,
        rewards,
        transactions,
        loading,
        refresh,
        addTask,
        editTask,
        removeTask,
        markTaskComplete,
        undoTaskCompletion,
        addReward,
        editReward,
        removeReward,
        redeem,
        addManual,
        removeTransaction,
      }}
    >
      {children}
    </RewardsContext.Provider>
  );
}

export function useRewards(): RewardsContextValue {
  const ctx = useContext(RewardsContext);
  if (!ctx) {
    throw new Error("useRewards must be used within a RewardsProvider");
  }
  return ctx;
}
