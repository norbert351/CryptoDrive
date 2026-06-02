# CryptoDrive

> Decentralized cloud storage powered by Aptos blockchain authentication and the Shelby Protocol.

[![Next.js](https://img.shields.io/badge/Frontend-Next.js_14+-000000?logo=next.js&logoColor=white)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/Backend-NestJS-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Aptos](https://img.shields.io/badge/Blockchain-Aptos-5F5FFF?logo=aptos&logoColor=white)](https://aptoslabs.com/)
[![Shelby](https://img.shields.io/badge/Storage-Shelby_Protocol-00C853?logo=shelby&logoColor=white)](https://shelby.xyz/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen)]()

---

## Screenshots

| Login | Dashboard | Upload |
|-------|-----------|--------|
| ![Login](https://placehold.co/400x250/1a1a2e/16a34a?text=Wallet+Login) | ![Dashboard](https://placehold.co/400x250/1a1a2e/16a34a?text=Dashboard) | ![Upload](https://placehold.co/400x250/1a1a2e/16a34a?text=Upload) |

| Shared Files | Settings | Starred |
|-------------|----------|---------|
| ![Shared](https://placehold.co/400x250/1a1a2e/16a34a?text=Shared+Files) | ![Settings](https://placehold.co/400x250/1a1a2e/16a34a?text=Settings) | ![Starred](https://placehold.co/400x250/1a1a2e/16a34a?text=Starred) |

---

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [System Flow](#system-flow)
- [Authentication Flow](#authentication-flow)
- [Upload Flow](#upload-flow)
- [Download Flow](#download-flow)
- [Database Design](#database-design)
- [Folder Structure](#folder-structure)
- [API Documentation](#api-documentation)
- [Shelby Integration](#shelby-integration)
- [Aptos Integration](#aptos-integration)
- [Security Model](#security-model)
- [Environment Variables](#environment-variables)
- [Installation Guide](#installation-guide)
- [Deployment Guide](#deployment-guide)
- [Future Roadmap](#future-roadmap)
- [Performance Considerations](#performance-considerations)
- [Troubleshooting](#troubleshooting)
- [Contributors](#contributors)
- [License](#license)

---

## Architecture Overview

```mermaid
graph TB
    subgraph Client["Client Layer"]
        User["User / Browser"]
        Wallet["Aptos Wallet<br/>(Petra / Martian)"]
    end

    subgraph Frontend["Frontend (Next.js 14+)"]
        Pages["Pages / Dashboard<br/>Upload / Shared / Settings"]
        Components["Components<br/>FileCard / FileGrid / Navbar"]
        Crypto["Client Crypto<br/>AES-256-GCM Encryption"]
        Auth["Auth Client<br/>Wallet Signing / JWT"]
    end

    subgraph Backend["Backend (NestJS)"]
        API["REST API<br/>Controllers"]
        AuthSvc["Auth Service<br/>Nonce / Verify / JWT"]
        FileSvc["File Service<br/>Upload / Download / List"]
        ShelbySvc["Shelby Service<br/>Commitments / putBlob"]
    end

    subgraph Storage["Data Layer"]
        MySQL[("MySQL<br/>File Metadata<br/>Encryption Keys<br/>Share Records")]
        Shelby[("Shelby Protocol<br/>Decentralized Blob Storage")]
    end

    subgraph Blockchain["Blockchain Layer"]
        Aptos["Aptos Testnet<br/>Blob Registration<br/>Wallet Identity"]
    end

    User --> Frontend
    Wallet --> Frontend
    Frontend --> API
    API --> AuthSvc
    API --> FileSvc
    FileSvc --> MySQL
    FileSvc --> ShelbySvc
    ShelbySvc --> Shelby
    FileSvc --> Aptos
    AuthSvc --> MySQL
    Frontend --> Crypto

    classDef frontend fill:#1a1a2e,stroke:#16a34a,color:#fff
    classDef backend fill:#1e293b,stroke:#e0234e,color:#fff
    classDef storage fill:#0f172a,stroke:#3b82f6,color:#fff
    classDef blockchain fill:#1e1b4b,stroke:#5f5fff,color:#fff
    classDef client fill:#111,stroke:#888,color:#fff

    class Frontend frontend
    class API,AuthSvc,FileSvc,ShelbySvc backend
    class MySQL,Shelby storage
    class Aptos blockchain
    class User,Wallet client
```

---

## System Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Frontend (Next.js)
    participant API as NestJS API
    participant Wallet as Aptos Wallet
    participant Shelby as Shelby Protocol
    participant DB as MySQL

    rect rgb(20, 25, 40)
        Note over User,DB: Authentication Phase
        User->>Frontend: Connect Wallet
        Frontend->>API: GET /auth/challenge
        API-->>Frontend: { nonce }
        Frontend->>Wallet: signMessage(nonce)
        Wallet-->>Frontend: signature
        Frontend->>API: POST /auth/verify
        API-->>Frontend: { accessToken }
    end

    rect rgb(25, 35, 50)
        Note over User,DB: Upload Phase
        User->>Frontend: Select File
        Frontend->>Frontend: AES-256-GCM Encrypt
        Frontend->>API: POST /upload (encrypted blob)
        API->>API: Generate Shelby commitments
        API-->>Frontend: { sessionId, blob_merkle_root }
        Frontend->>Wallet: signAndSubmitTransaction
        Wallet-->>Frontend: { txHash }
        Frontend->>API: POST /upload/complete
        API->>Shelby: putBlob(encrypted data)
        API->>DB: INSERT file metadata
        API-->>Frontend: { id, blobName }
    end

    rect rgb(30, 40, 55)
        Note over User,DB: Download Phase
        User->>Frontend: Click Download
        Frontend->>API: GET /download/:id (JWT)
        API->>DB: SELECT file
        API->>API: Verify ownership / share
        API->>Shelby: Download blob
        Shelby-->>API: encrypted bytes
        API-->>Frontend: encrypted file stream
        Frontend->>Frontend: Decrypt & save
    end
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Wallet as Aptos Wallet
    participant Frontend as Frontend
    participant Backend as NestJS API

    User->>Frontend: Click "Connect Wallet"
    Frontend->>Wallet: connect()
    Wallet-->>Frontend: { address }

    Frontend->>Backend: GET /auth/challenge
    Backend->>Backend: Generate UUID nonce
    Backend-->>Frontend: { nonce }

    Frontend->>Wallet: signMessage({ message, nonce })
    Wallet-->>User: Prompt signature
    User->>Wallet: Approve
    Wallet-->>Frontend: { signature, publicKey }

    Frontend->>Backend: POST /auth/verify
    Note over Frontend,Backend: { address, nonce, signature, publicKey, fullMessage }

    Backend->>Backend: Consume nonce
    Backend->>Backend: Derive address from publicKey
    Backend->>Backend: Verify Ed25519 signature
    Backend-->>Frontend: { accessToken: JWT }

    Frontend->>Frontend: Store JWT in localStorage
    Frontend->>Frontend: Redirect to Dashboard
```

---

## Upload Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Frontend
    participant Wallet as Aptos Wallet
    participant API as NestJS API
    participant Shelby as Shelby Protocol
    participant DB as MySQL

    User->>Frontend: Select file + click Upload
    Frontend->>Frontend: deriveWrapKeyFromWallet()
    Frontend->>Frontend: generateDek() → AES-256-GCM key
    Frontend->>Frontend: encryptFile(dek, file) → { ciphertext, iv }
    Frontend->>Frontend: wrapDek(dek, wrapKey) → encryptedDek

    Frontend->>API: POST /upload (FormData: encrypted blob)
    API->>API: Generate Shelby commitments
    API-->>Frontend: { sessionId, blobName, blob_merkle_root, ... }

    Frontend->>Wallet: signAndSubmitTransaction(registerBlob payload)
    Wallet-->>Frontend: { hash: txHash }

    Frontend->>API: POST /upload/complete
    Note over Frontend,API: { sessionId, txHash, iv, encryptedDek, mimeType }

    API->>API: Verify Aptos transaction
    API->>Shelby: putBlob(encrypted data stream)
    API->>DB: INSERT files (id, filename, blobName, ownerAddress, iv, encryptedDek)
    API-->>Frontend: { id, blobName, size }

    Frontend->>User: Show success
```

---

## Download Flow

```mermaid
sequenceDiagram
    participant User as User
    participant Frontend as Frontend
    participant Wallet as Aptos Wallet
    participant API as NestJS API
    participant Shelby as Shelby Protocol
    participant DB as MySQL

    User->>Frontend: Click Download on file
    Frontend->>Frontend: getAccessToken()

    Frontend->>API: GET /download/:id
    Note over Frontend,API: Authorization: Bearer <JWT>

    API->>DB: SELECT * FROM files WHERE id = :id
    DB-->>API: { filename, blobName, ownerAddress, iv, encryptedDek }

    API->>API: wallet === ownerAddress?
    alt Not Owner
        API->>DB: SELECT * FROM shared_files WHERE fileId=:id AND sharedWith=:wallet
        DB-->>API: { share record } or null
        API->>API: Verify revoked_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())
        alt No Active Share
            API-->>Frontend: 403 Forbidden
            Frontend->>User: "You do not have permission"
        end
    end

    API->>Shelby: Download blob from Shelby
    Shelby-->>API: Encrypted blob bytes

    API-->>Frontend: Encrypted file stream (binary)

    Frontend->>Wallet: deriveWrapKeyFromWallet() (signature prompt)
    Wallet-->>Frontend: wrap key
    Frontend->>Frontend: unwrapDek(encryptedDek, wrapKey) → DEK
    Frontend->>Frontend: decryptBytes(DEK, ciphertext, iv) → plaintext
    Frontend->>Frontend: Create Blob + Object URL
    Frontend->>Frontend: Trigger <a> download
    Frontend->>User: File saved
```

---

## Database Design

```mermaid
erDiagram
    files {
        varchar id PK "UUID v4"
        varchar filename "Original filename"
        varchar blob_name "Shelby blob path"
        varchar owner_address "Aptos wallet address"
        int size "File size in bytes"
        varchar mime_type "MIME type (nullable)"
        varchar iv "AES-GCM IV hex (nullable)"
        text encrypted_dek "Wrapped DEK base64 (nullable)"
        timestamp created_at "Auto-generated"
    }

    shared_files {
        varchar id PK "UUID v4"
        varchar file_id FK "Reference to files.id"
        varchar shared_by "Owner wallet address"
        varchar shared_with "Recipient wallet address"
        timestamp revoked_at "Null = active"
        timestamp expires_at "Null = never expires"
        timestamp created_at "Auto-generated"
    }

    files ||--o{ shared_files : "has"
```

---

## Folder Structure

```
crypto-drive/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── auth/                 # JWT authentication module
│   │   │   │   ├── auth.module.ts
│   │   │   │   ├── auth.controller.ts    # /auth/challenge, /auth/verify
│   │   │   │   ├── auth.service.ts       # Nonce issuance, signature verification
│   │   │   │   ├── jwt-auth.guard.ts     # JWT guard for protected routes
│   │   │   │   └── dto/
│   │   │   │       └── verify-wallet.dto.ts
│   │   │   ├── files/               # File management module
│   │   │   │   ├── files.module.ts
│   │   │   │   ├── files.controller.ts  # Upload, download, list endpoints
│   │   │   │   ├── files.service.ts     # Business logic + Shelby integration
│   │   │   │   └── dto/
│   │   │   │       └── finalize-upload.dto.ts
│   │   │   ├── shelby/              # Shelby Protocol service
│   │   │   │   ├── shelby.module.ts
│   │   │   │   └── shelby.service.ts    # Client creation, commitments, encoding
│   │   │   ├── database/            # Database layer
│   │   │   │   ├── database.module.ts   # MySQL + Drizzle ORM provider
│   │   │   │   ├── schema.ts            # Tables: files, shared_files
│   │   │   │   └── index.ts
│   │   │   ├── app.module.ts        # Root module
│   │   │   ├── app.controller.ts    # Health check
│   │   │   ├── app.service.ts
│   │   │   └── main.ts              # Entry point, CORS, validation
│   │   ├── drizzle/                 # Database migrations
│   │   ├── data/                    # Pending uploads temp storage
│   │   ├── .env                     # Environment variables
│   │   ├── drizzle.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── web/                         # Next.js Frontend
│       └── src/
│           ├── app/                 # App Router pages
│           │   ├── dashboard/       # Main dashboard with file grid
│           │   ├── upload/          # File upload with encryption flow
│           │   ├── shared/          # Shared files view
│           │   ├── settings/        # User settings
│           │   ├── starred/         # Starred files
│           │   ├── files/           # Individual file view
│           │   ├── layout.tsx       # Root layout with nav + providers
│           │   ├── page.tsx         # Landing page
│           │   └── globals.css      # Tailwind + glass styles
│           ├── components/          # Reusable UI components
│           │   ├── FileCard.tsx     # File display component
│           │   ├── FileGrid.tsx     # Grid/list layout wrapper
│           │   ├── Navbar.tsx       # Top navigation bar
│           │   ├── BottomNav.tsx    # Mobile bottom navigation
│           │   ├── WalletProviders.tsx   # Aptos wallet adapter provider
│           │   ├── WalletModal.tsx       # Wallet connection modal
│           │   ├── WalletModalProvider.tsx
│           │   ├── ProtectedRoute.tsx    # Auth guard wrapper
│           │   ├── EmptyState.tsx
│           │   ├── DashboardStats.tsx
│           │   ├── FloatingMenu.tsx
│           │   └── RouteLoading.tsx
│           └── lib/                 # Utility libraries
│               ├── api.ts           # API client, token management
│               ├── auth-wallet.ts   # Wallet login helper
│               ├── crypto.ts        # AES-GCM encrypt/decrypt, key derivation
│               └── utils.ts         # Tailwind class merge helper
│
├── package.json                     # Workspace root
└── README.md
```

---

## API Documentation

### Authentication

#### `GET /auth/challenge`

Request a signing challenge nonce.

```
GET http://localhost:4000/auth/challenge
```

**Response `200`**

```json
{
  "nonce": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

#### `POST /auth/verify`

Verify a wallet signature and receive a JWT.

```
POST http://localhost:4000/auth/verify
Content-Type: application/json
```

**Request**

```json
{
  "address": "0x1234...abcd",
  "fullMessage": "CryptoDrive encryption key derivation v1",
  "publicKeyHex": "0xdead...beef",
  "signatureHex": "0xabcd...1234",
  "nonce": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response `201`**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Files

#### `POST /upload`

Upload an encrypted file to prepare Shelby commitments.

```
POST http://localhost:4000/upload
Authorization: Bearer <jwt>
Content-Type: multipart/form-data
```

**Request**

| Field | Type | Description |
|-------|------|-------------|
| `file` | File | Encrypted file blob |

**Response `201`**

```json
{
  "sessionId": "uuid-v4",
  "blobName": "cryptodrive/<session>/<filename>",
  "blob_merkle_root": "0x...",
  "raw_data_size": 123456,
  "numChunksets": 4,
  "expirationMicros": 1735689600000000,
  "encoding": 0
}
```

---

#### `POST /upload/complete`

Finalize an upload after Aptos transaction confirmation.

```
POST http://localhost:4000/upload/complete
Authorization: Bearer <jwt>
Content-Type: application/json
```

**Request**

```json
{
  "sessionId": "uuid-v4",
  "registerTxHash": "0xabcdef...123456",
  "iv": "1a2b3c4d5e6f7a8b9c0d1e2f",
  "encryptedDek": "base64-encoded-wrapped-key",
  "mimeType": "application/pdf"
}
```

**Response `201`**

```json
{
  "id": "uuid-v4",
  "blobName": "cryptodrive/<session>/<filename>",
  "size": 123456,
  "registerTxHash": "0xabcdef...123456"
}
```

---

#### `GET /files`

List files owned by the authenticated wallet.

```
GET http://localhost:4000/files?owner=0x1234...abcd
Authorization: Bearer <jwt>
```

**Response `200`**

```json
[
  {
    "id": "uuid-v4",
    "filename": "document.pdf",
    "blobName": "cryptodrive/<session>/document.pdf",
    "ownerAddress": "0x1234...abcd",
    "size": 123456,
    "mimeType": "application/pdf",
    "iv": "1a2b3c4d5e6f7a8b9c0d1e2f",
    "encryptedDek": "base64...",
    "createdAt": "2026-06-01T00:00:00.000Z"
  }
]
```

---

#### `GET /download/:id`

Download an encrypted file. Ownership or active share required.

```
GET http://localhost:4000/download/:id
Authorization: Bearer <jwt>
```

**Response `200`**

Returns the encrypted file as binary stream (`application/octet-stream`).

**Response `403`**

```json
{
  "statusCode": 403,
  "message": "You do not have access to this file"
}
```

---

#### `GET /health`

Health check endpoint.

```
GET http://localhost:4000/health
```

**Response `200`**

```json
{
  "ok": true,
  "app": "CryptoDrive API"
}
```

---

## Shelby Integration

Shelby Protocol provides decentralized blob storage on top of the Aptos blockchain. CryptoDrive uses Shelby for durable, verifiable file storage.

### How It Works

```mermaid
graph LR
    subgraph Client["Client Side"]
        File["Raw File"]
        Encrypted["AES-256-GCM<br/>Encrypted Blob"]
    end

    subgraph Backend["Backend (NestJS)"]
        Commit["Generate Shelby<br/>Commitments"]
        PutBlob["putBlob() to Shelby<br/>Node RPC"]
        Meta["Store Metadata<br/>in MySQL"]
    end

    subgraph Shelby["Shelby Protocol"]
        Encoding["Erasure Coding<br/>& Chunking"]
        Merkle["Merkle Tree<br/>Root"]
        Storage["Decentralized<br/>Blob Storage"]
    end

    subgraph Aptos["Aptos Blockchain"]
        Register["register_blob<br/>Transaction"]
        Verify["On-chain<br/>Verification"]
    end

    File --> Encrypted
    Encrypted --> Commit
    Commit --> Meta
    Commit --> Register
    Register --> Verify
    Encrypted --> PutBlob
    PutBlob --> Encoding
    Encoding --> Merkle
    Merkle --> Storage
    Merkle --> Register

    classDef client fill:#1a1a2e,stroke:#16a34a,color:#fff
    classDef backend fill:#1e293b,stroke:#e0234e,color:#fff
    classDef shelby fill:#0f172a,stroke:#00c853,color:#fff
    classDef aptos fill:#1e1b4b,stroke:#5f5fff,color:#fff

    class Client client
    class Backend backend
    class Shelby shelby
    class Aptos aptos
```

### Upload to Shelby

1. **Encryption** — File is AES-256-GCM encrypted in the browser. Server never sees plaintext.
2. **Commitments** — Backend generates Shelby erasure coding commitments from the encrypted data.
3. **Aptos Registration** — Wallet signs a `register_blob` transaction with the blob Merkle root.
4. **putBlob** — Backend streams the encrypted data to Shelby RPC nodes with retry logic.
5. **Metadata** — Filename, blob path, owner, IV, and wrapped DEK are stored in MySQL.

### Download from Shelby

1. **Authorization** — Backend verifies JWT + wallet ownership or active share record.
2. **Blob URL** — Constructs the Shelby public blob URL from the owner address and blob name.
3. **Streaming** — Backend fetches the blob from Shelby and streams it to the client.
4. **Decryption** — Frontend unwraps the DEK using a wallet-derived key, then decrypts with AES-GCM.

### Blob URL Pattern

```
https://api.testnet.shelby.xyz/shelby/v1/blobs/<owner-wallet-address>/<blob-name>
```

---

## Aptos Integration

```mermaid
sequenceDiagram
    participant User as User
    participant Wallet as Aptos Wallet
    participant Frontend as Frontend
    participant API as NestJS API
    participant Aptos as Aptos Chain

    rect rgb(20, 30, 50)
        Note over User,Aptos: Authentication
        User->>Wallet: Connect
        Wallet-->>Frontend: { address }
        Frontend->>API: GET /auth/challenge
        API-->>Frontend: { nonce }
        Frontend->>Wallet: signMessage(fullMessage + nonce)
        Wallet-->>Frontend: { signature }
        Frontend->>API: POST /auth/verify
        API->>API: Recover address from publicKey
        API->>API: Verify Ed25519 signature
        API-->>Frontend: { accessToken: JWT }
    end

    rect rgb(25, 35, 55)
        Note over User,Aptos: File Registration
        Frontend->>API: POST /upload
        API-->>Frontend: { blob_merkle_root, ... }
        Frontend->>Wallet: signAndSubmitTransaction()
        Note over Frontend,Wallet: register_blob(merkle_root, size, encoding)
        Wallet->>Aptos: Submit transaction
        Aptos-->>Wallet: { hash }
        Wallet-->>Frontend: { hash }
        Frontend->>API: POST /upload/complete
        API->>Aptos: waitForTransaction(hash)
        API->>API: Verify sender === wallet
        API-->>Frontend: { id }
    end
```

### Wallet Login

CryptoDrive uses Aptos wallet adapters (Petra, Martian, etc.) for authentication:

1. **Challenge** — Backend issues a UUID nonce with a 10-minute TTL.
2. **Signing** — Wallet signs `{ message: "CryptoDrive encryption key derivation v1", nonce }`.
3. **Verification** — Backend derives the wallet address from the Ed25519 public key and verifies the signature.
4. **JWT** — On success, issues a 24-hour JWT with `sub: wallet_address`.

### Transaction Verification

When uploading, the backend:

1. Waits for the Aptos transaction to confirm via `waitForTransaction`.
2. Fetches the transaction and verifies the `sender` matches the authenticated wallet.
3. Only proceeds with Shelby `putBlob` after on-chain confirmation.

---

## Security Model

```mermaid
graph TB
    subgraph ThreatModel["Threat Model"]
        UnAuth["Unauthorized Access"]
        Replay["Replay Attacks"]
        Tamper["Data Tampering"]
        Expose["Key Exposure"]
    end

    subgraph Defenses["Defenses"]
        JWT["JWT Authentication<br/>24h expiry"]
        Nonce["Challenge Nonces<br/>10min TTL, single use"]
        Verify["Ed25519 Signature<br/>Verification"]
        Ownership["Ownership Check<br/>wallet === ownerAddress"]
        Shares["Shared Access Check<br/>revoked_at IS NULL<br/>expires_at > NOW()"]
        Encrypt["AES-256-GCM<br/>Client-side Encryption"]
        GCM["GCM Auth Tag<br/>Tamper Detection"]
        Wrap["AES-KW Key Wrapping<br/>DEK never in plaintext"]
    end

    UnAuth --> JWT
    UnAuth --> Ownership
    UnAuth --> Shares
    Replay --> Nonce
    Tamper --> GCM
    Expose --> Encrypt
    Expose --> Wrap

    classDef threat fill:#3b0a0a,stroke:#ef4444,color:#fff
    classDef defense fill:#0a3b0a,stroke:#16a34a,color:#fff
    class ThreatModel threat
    class Defenses defense
```

### Key Security Properties

| Property | Implementation |
|----------|---------------|
| **Authentication** | Ed25519 wallet signature verification + JWT |
| **Replay Protection** | Single-use UUID nonces with 10-minute TTL |
| **Authorization** | Ownership check (`ownerAddress === wallet`) or active share record |
| **Encryption** | AES-256-GCM client-side, server never sees plaintext |
| **Key Management** | DEK wrapped with AES-KW using HKDF-derived key from wallet signature |
| **Data Integrity** | AES-GCM authentication tag + Shelby Merkle root verification |
| **Access Revocation** | `shared_files.revoked_at` and `shared_files.expires_at` enforced on every download |

---

## Environment Variables

### Frontend (`apps/web/.env.local`)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:4000` |
| `NEXT_PUBLIC_APTOS_API_KEY` | Aptos API key (optional) | — |

### Backend (`apps/api/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API server port | `4000` |
| `FRONTEND_ORIGIN` | CORS allowed origin | `http://localhost:3000` |
| `DATABASE_URL` | MySQL connection string | `mysql://root:@localhost:3307/cryptodrive` |
| `JWT_SECRET` | JWT signing secret (256-bit hex) | — |
| `SHELBY_API_KEY` | Shelby Protocol API key | — |
| `APTOS_API_KEY` | Aptos API key | — |

---

## Installation Guide

### Prerequisites

- **Node.js** 18+ (recommended 20 LTS)
- **MySQL** 8.0+ (or compatible, e.g., MariaDB)
- **Aptos Wallet** (Petra or Martian browser extension)
- **npm** 9+

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/crypto-drive.git
cd crypto-drive

# Install all dependencies (workspace root)
npm install
```

### Database

```bash
# Configure MySQL connection
# Edit apps/api/.env:
#   DATABASE_URL=mysql://user:password@localhost:3306/cryptodrive

# Run database migrations
npm run migrate
```

### Backend

```bash
# Start the NestJS API in development mode
npm run dev:api

# API runs at http://localhost:4000
# Health check: http://localhost:4000/health
```

### Frontend

```bash
# Start the Next.js frontend (in a separate terminal)
npm run dev:web

# App runs at http://localhost:3000
```

### Usage

1. Install Petra or Martian wallet browser extension.
2. Switch to Aptos Testnet in your wallet.
3. Open `http://localhost:3000` and click "Connect Wallet".
4. Approve the signature prompt to authenticate.
5. Upload files — they are encrypted in your browser before upload.
6. Download files — they are decrypted in your browser after download.

---

## Deployment Guide

```mermaid
graph TB
    subgraph Production["Production Deployment"]
        subgraph FrontendHost["Vercel"]
            Next["Next.js Static<br/>+ SSR"]
            EnvFE["env: NEXT_PUBLIC_API_URL"]
        end

        subgraph BackendHost["Railway / Render"]
            Nest["NestJS Server"]
            EnvBE["env: JWT_SECRET, DATABASE_URL<br/>SHELBY_API_KEY, APTOS_API_KEY"]
        end

        subgraph Database["MySQL"]
            PlanetScale["PlanetScale /<br/>Railway MySQL"]
        end

        subgraph External["External Services"]
            ShelbyAPI["Shelby Protocol API<br/>api.testnet.shelby.xyz"]
            AptosRPC["Aptos Testnet RPC"]
        end

        User --> FrontendHost
        FrontendHost --> BackendHost
        BackendHost --> Database
        BackendHost --> External
    end

    classDef vercel fill:#1a1a2e,stroke:#16a34a,color:#fff
    classDef railway fill:#1e293b,stroke:#e0234e,color:#fff
    classDef db fill:#0f172a,stroke:#3b82f6,color:#fff
    classDef external fill:#1e1b4b,stroke:#5f5fff,color:#fff

    class FrontendHost vercel
    class BackendHost railway
    class Database db
    class External external
```

### Frontend (Vercel)

```bash
# Build
npm run build:web

# Deploy
# Connect repository to Vercel
# Set NEXT_PUBLIC_API_URL to your deployed backend URL
```

### Backend (Railway / Render)

```bash
# Build
npm run build:api

# Deploy
# Set environment variables in your hosting dashboard:
#   PORT, DATABASE_URL, JWT_SECRET, SHELBY_API_KEY, APTOS_API_KEY
#   FRONTEND_ORIGIN=https://your-frontend.vercel.app
```

### Database

```bash
# Option 1: PlanetScale (MySQL-compatible serverless)
# Option 2: Railway MySQL plugin
# Option 3: Self-hosted MySQL on VPS

# After provisioning, update DATABASE_URL and run:
npm run migrate
```

---

## Future Roadmap

| Phase | Feature | Status |
|-------|---------|--------|
| **1** | Wallet authentication | ✅ Complete |
| **1** | File upload with encryption | ✅ Complete |
| **1** | File download with decryption | ✅ Complete |
| **1** | Dashboard with file grid | ✅ Complete |
| **2** | File sharing with other wallets | In Progress |
| **2** | Shared files page | Planned |
| **2** | Revocable share links | Planned |
| **2** | Team workspaces | Planned |
| **3** | End-to-end zero-knowledge encryption | Planned |
| **3** | Smart contract-based permissions | Planned |
| **3** | Encrypted file preview | Planned |
| **4** | AI-powered file search | Future |
| **4** | Multi-chain support (Solana, Ethereum) | Future |
| **4** | Mobile native apps | Future |
| **4** | File versioning | Future |

---

## Performance Considerations

### Upload Optimization

- **Chunked streaming** — Files are streamed to Shelby in chunks with progress callbacks.
- **Retry logic** — Exponential backoff with up to 3 retries for Shelby `putBlob`.
- **Timeout management** — 60-second timeouts per upload step prevent hanging connections.

### Download Optimization

- **Direct streaming** — Backend streams Shelby blob directly to frontend without buffering entirely in memory.
- **Browser-level decryption** — AES-GCM decryption runs in the browser using Web Crypto API (hardware-accelerated).

### Database

- **Indexed queries** — Primary key lookups on `files.id` and `files.owner_address`.
- **Lightweight metadata** — Only metadata stored in MySQL; blob data lives on Shelby.
- **Connection pooling** — MySQL2 pool with 10 connection limit.

### Shelby Protocol

- **Erasure coding** — Files are erasure-coded for redundancy without full replication.
- **Merkle verification** — Blob integrity verified via Merkle root on Aptos.
- **Lazy commitments** — Commitments generated once at upload time.

---

## Troubleshooting

### Wallet Connection Failed

```
Error: Connect wallet first
```

**Solution:** Ensure the Petra/Martian browser extension is installed and unlocked. Switch to Aptos Testnet network.

### JWT Expired

```
Error: Invalid token / 401 Unauthorized
```

**Solution:** Reconnect your wallet. The token has a 24-hour expiry. Re-authentication will issue a new JWT.

### Shelby Upload Failed

```
Error: Shelby API authentication failed
```

**Solution:** Verify `SHELBY_API_KEY` and `APTOS_API_KEY` are correctly set in `apps/api/.env`. Check that the API keys have not expired.

### Download Failed

```
Error: You do not have permission to download this file
```

**Solution:** Only the file owner or users with an active share can download. Verify the file is owned by your connected wallet address, or ask the owner to share it with you.

### Database Connection Failed

```
Error: DATABASE_URL is missing
```

**Solution:** Ensure `DATABASE_URL` is set in `apps/api/.env`. The format is `mysql://user:password@host:port/database`. Verify MySQL is running:

```bash
mysql -u root -p -e "SELECT 1"
```

### Upload Timeout

```
Error: Request timed out after 60 seconds
```

**Solution:** Large files may take longer. Check backend logs for the last completed checkpoint. The upload may have partially completed but timed out during the Shelby `putBlob` phase. Try again with a smaller file.

---

## Contributors

<p align="center">
  <em>Built with passion for decentralized storage and Web3.</em>
</p>

Contributions are welcome! Please open an issue or submit a pull request.

### Development Setup

```bash
git clone https://github.com/your-org/crypto-drive.git
cd crypto-drive
npm install

# Start both frontend and backend
npm run dev:api   # Terminal 1
npm run dev:web   # Terminal 2
```

### Code Style

- Backend follows NestJS conventions with TypeScript strict mode.
- Frontend uses Next.js App Router with TypeScript.
- Database migrations via Drizzle ORM.
- ESLint + Prettier for consistent formatting.

---

## License

MIT License

Copyright (c) 2026 CryptoDrive

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
