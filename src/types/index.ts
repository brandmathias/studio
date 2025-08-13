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
  segment: 'Platinum' | 'Reguler' | 'Berisiko' | 'none';
  upc: 'Wanea' | 'Ranotana' | 'N/A';
}
