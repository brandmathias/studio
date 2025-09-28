-- =============================================================================
-- Skema Database Konseptual untuk Aplikasi NAVIGA
-- =============================================================================
-- Catatan: Aplikasi ini menggunakan Local Storage peramban, bukan database SQL.
-- Skema di bawah ini adalah representasi DDL (Data Definition Language) dari
-- struktur data yang disimpan dalam Local Storage untuk tujuan visualisasi
-- dan pemahaman desain, misalnya untuk diimpor ke alat ERD seperti ERDPlus.
-- =============================================================================


-- Tabel Pengguna (Admin)
-- Menyimpan informasi akun admin yang dapat login ke sistem.
-- Diimplementasikan sebagai objek JSON di Local Storage dengan kunci 'loggedInUser'.
CREATE TABLE Users (
    email VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    upc VARCHAR(50) NOT NULL CHECK (upc IN ('Pegadaian Wanea', 'Pegadaian Ranotana', 'all')),
    avatar_url TEXT -- Disimpan sebagai URL data Base64
);


-- Tabel Kolom Kanban
-- Mendefinisikan kolom-kolom pada papan Kanban (e.g., 'To Do', 'In Progress', 'Done').
-- Diimplementasikan sebagai bagian dari objek 'taskBoardData_{upc}' di Local Storage.
CREATE TABLE Kanban_Columns (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    upc_owner VARCHAR(50) NOT NULL, -- Menunjukkan milik UPC mana (e.g., 'Pegadaian Wanea')
    column_order INT NOT NULL, -- Menyimpan urutan kolom
    FOREIGN KEY (upc_owner) REFERENCES Users(upc)
);


-- Tabel Tugas (Tasks)
-- Menyimpan detail setiap tugas yang ada di papan Kanban.
-- Diimplementasikan sebagai bagian dari objek 'taskBoardData_{upc}' di Local Storage.
CREATE TABLE Tasks (
    id VARCHAR(255) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMP,
    column_id VARCHAR(255) NOT NULL, -- Menunjukkan di kolom mana tugas ini berada
    FOREIGN KEY (column_id) REFERENCES Kanban_Columns(id)
);


-- Tabel Label Tugas
-- Tabel perantara untuk hubungan many-to-many antara Tugas dan Label.
CREATE TABLE Task_Labels (
    task_id VARCHAR(255),
    label_name VARCHAR(100),
    PRIMARY KEY (task_id, label_name),
    FOREIGN KEY (task_id) REFERENCES Tasks(id) ON DELETE CASCADE
);


-- Tabel Riwayat Aktivitas
-- Berfungsi sebagai log audit untuk semua aktivitas broadcast.
-- Diimplementasikan sebagai array objek JSON di Local Storage dengan kunci 'broadcastHistory_{upc}'.
CREATE TABLE History_Logs (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL,
    broadcast_type VARCHAR(50) NOT NULL CHECK (broadcast_type IN ('Gadaian Broadcast', 'Angsuran Broadcast')),
    customer_name VARCHAR(255) NOT NULL,
    customer_identifier VARCHAR(255) NOT NULL, -- Nomor SBG atau ID nasabah lain
    status VARCHAR(50) NOT NULL, -- e.g., 'Pesan Disalin', 'Notifikasi Terkirim'
    template_used VARCHAR(50) NOT NULL, -- e.g., 'jatuh-tempo', 'keterlambatan'
    admin_email VARCHAR(255) NOT NULL,
    FOREIGN KEY (admin_email) REFERENCES Users(email)
);


-- =============================================================================
-- Representasi Data Sementara (Tidak Disimpan di Local Storage)
-- =============================================================================

-- Tabel Nasabah Gadai (dari PDF)
-- Data ini bersifat sementara, hanya ada saat halaman Gadaian Broadcast aktif.
CREATE TABLE Temp_Broadcast_Customers (
    sbg_number VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    phone_number VARCHAR(50),
    credit_date DATE,
    due_date DATE,
    loan_value DECIMAL(15, 2),
    barang_jaminan TEXT,
    taksiran DECIMAL(15, 2),
    sewa_modal DECIMAL(15, 2),
    alamat TEXT,
    status VARCHAR(50)
);

-- Tabel Nasabah Angsuran (dari XLSX)
-- Data ini bersifat sementara, hanya ada saat halaman Angsuran Broadcast aktif.
CREATE TABLE Temp_Installment_Customers (
    id VARCHAR(255) PRIMARY KEY,
    nasabah VARCHAR(255),
    produk VARCHAR(255),
    pinjaman DECIMAL(15, 2),
    osl DECIMAL(15, 2),
    kol INT,
    hr_tung INT,
    tenor VARCHAR(50),
    angsuran DECIMAL(15, 2),
    kewajiban DECIMAL(15, 2),
    pencairan VARCHAR(100),
    kunjungan_terakhir VARCHAR(100)
);

-- Akhir dari skema --
