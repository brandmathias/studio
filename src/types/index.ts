export type FollowUpStatus = 'baru' | 'dihubungi' | 'janji-bayar' | 'tidak-merespons' | 'selesai';

export interface Customer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  due_date: string; // Format: YYYY-MM-DD
  transaction_type: 'gadai' | 'angsuran';
  priority: 'tinggi' | 'sedang' | 'rendah' | 'none';
  loan_value: number;
  has_been_late_before: boolean;
  segment: 'Platinum' | 'Reguler' | 'Berisiko' | 'Potensi Churn' | 'none';
  upc: 'Pegadaian Wanea' | 'Pegadaian Ranotana' | 'N/A';
  transaction_count: number; // For segmentation
  days_since_last_transaction: number; // For segmentation
  barang_jaminan: string;
  follow_up_status: FollowUpStatus;
}

export interface BroadcastCustomer {
  sbg_number: string;
  rubrik: string;
  name: string;
  phone_number: string;
  credit_date: string;
  due_date: string;
  loan_value: number;
  barang_jaminan: string;
  taksiran: number;
  sewa_modal: number;
  alamat: string;
  status: string;
}

export interface ScheduledTask {
  id: string;
  customerId: string;
  customerName: string;
  date: string; // ISO string for the date
  note: string;
  isCompleted: boolean;
}

// Types for the new Task Workflow Tracker
export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee?: {
    name: string;
    avatar?: string;
  };
  labels?: string[];
  dueDate?: string;
}

export interface Column {
  id: string;
  title: string;
  taskIds: string[];
}

export interface TaskBoardData {
  tasks: Record<string, Task>;
  columns: Record<string, Column>;
  columnOrder: string[];
}
