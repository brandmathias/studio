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
