
# Diagram Arsitektur NAVIGA

Berikut adalah diagram yang memvisualisasikan arsitektur frontend dan backend aplikasi NAVIGA. Anda dapat menyalin kode di bawah ini dan menempelkannya ke editor yang mendukung Mermaid (seperti [Mermaid Live Editor](https://mermaid.live) atau plugin di VS Code) untuk melihat diagramnya.

```mermaid
graph TD
    subgraph Pengguna
        A[Admin UPC]
    end

    subgraph "Frontend (Browser - Next.js App)"
        B(Client Components: React, ShadCN/UI, Tailwind)
        C(Server Components: Next.js 15)
        D(Local Storage: Sesi Login)

        A -- Interaksi UI --> B
        B -- Memanggil --> E[Server Actions]
        C -- Render UI Awal --> A
    end

    subgraph "Backend (Serverless)"
        E -- Memanggil Flow --> F(Genkit Flows)
        F -- Menggunakan --> G(Google Gemini AI Model)
        E -- Berinteraksi dengan --> H(Cloud Firestore)

        subgraph "Logika AI (di dalam Genkit)"
            G1[Ekstraksi Data PDF/XLSX]
            G2[Text-to-Speech]
        end
        
        subgraph "Database (Firebase)"
            H1[Collection: users]
            H2[Collection: taskBoards]
            H3[Collection: history]
        end

        F --> G1
        F --> G2
        H --- H1 & H2 & H3
    end

    %% Styling
    classDef frontend fill:#E6F3FF,stroke:#B3D9FF,stroke-width:2px;
    classDef backend fill:#F0E6FF,stroke:#D1B3FF,stroke-width:2px;
    classDef user fill:#FFE6E6,stroke:#FFB3B3,stroke-width:2px;
    classDef ai fill:#E6FFF2,stroke:#B3FFD1,stroke-width:2px;
    classDef db fill:#FFF2E6,stroke:#FFD9B3,stroke-width:2px;
    
    class A user;
    class B,C,D frontend;
    class E,F,G backend;
    class G1,G2 ai;
    class H,H1,H2,H3 db;

```

### Penjelasan Singkat Diagram

1.  **Pengguna (Admin UPC)**: Berinteraksi dengan antarmuka aplikasi.
2.  **Frontend**:
    *   **Client Components**: Menangani semua interaksi pengguna (klik tombol, input form) dan memanggil *Server Actions*.
    *   **Server Components**: Merender tampilan awal halaman untuk performa cepat.
    *   **Local Storage**: Digunakan secara minimalis, hanya untuk menyimpan status sesi login.
3.  **Backend (Serverless)**:
    *   **Server Actions**: Bertindak sebagai jembatan aman antara frontend dan logika backend.
    *   **Genkit Flows**: Mengorkestrasi tugas-tugas AI, seperti memanggil model Gemini untuk ekstraksi data atau TTS.
    *   **Google Gemini AI**: Model AI yang melakukan pekerjaan berat seperti analisis dokumen.
    *   **Cloud Firestore**: Database NoSQL tempat semua data persisten aplikasi (profil, tugas, riwayat) disimpan.

Diagram ini menunjukkan bagaimana data mengalir dari interaksi pengguna, diproses oleh Next.js, diperkaya oleh AI melalui Genkit, dan akhirnya disimpan atau diambil dari Cloud Firestore.
