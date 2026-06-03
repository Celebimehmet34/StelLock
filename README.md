# Stellock — B2B Escrow Infrastructure

*"A verifiable delivery, commercial privacy, and crypto-agnostic access layer on top of Trustless Work escrow."*

Stellock is a next-generation B2B payment (escrow) infrastructure built on the Stellar network and Trustless Work framework, aiming to solve the trust issues between freelancers and clients, such as "I delivered the work but didn't get paid" or "I paid but didn't receive the work".

---

## 🚀 Key Features

Stellock goes beyond a simple smart contract application by adding 3 core layers focused on user experience:

1. **Verifiable Delivery:** Instead of just claiming "I delivered the work", the delivered file itself is cryptographically proven (IPFS + SHA-256).
2. **Privacy Layer (Commitment Scheme):** Commercial terms between parties are not written to the chain as plaintext. The terms are salted and hashed.
3. **Seedless Access (Passkey):** Users do not need to memorize a *seed phrase* or install a browser wallet extension. Transactions are approved using Face ID / Touch ID biometric data.

---

## 🛠 Technologies & Architecture

The project is developed using a modern, fast, and secure technology stack:

*   **SvelteKit:** Extremely fast frontend framework used to simulate the B2B interface (Reference App).
*   **Stellar Network & Trustless Work:** For the core escrow logic, locking, and releasing funds.
*   **smart-account-kit:** To manage biometric signing (Passkey) processes by abstracting the wallet infrastructure (Account Abstraction).
*   **Pinata (IPFS):** Decentralized, censorship-resistant, and secure file storage infrastructure.
*   **Web Crypto API:** For fast and secure client-side SHA-256 hashing operations.

---

## 🔄 How It Works (3-Step Flow)

The system works end-to-end as follows:

### 1. Deposit (Locking Funds)
*   The **Buyer (Client)** enters the amount of USDC they want to pay, the counterparty, and the service **terms**.
*   The system hashes the terms in `SHA-256(terms + salt)` format.
*   The Buyer approves the transaction via Face ID / Touch ID.
*   The amount and only the hashed condition (Privacy Hash) are locked into the Trustless Work contract. No transparent data is placed on the chain.

### 2. Deliver (Delivery & Proof)
*   The **Seller (Freelancer)** uploads the file to the system once the work is completed.
*   The file is uploaded to the **IPFS network (Pinata)**. Simultaneously, a SHA-256 hash of the file is generated.
*   The file hash (Evidence Hash) is recorded in the `evidence` field of the Trustless Work contract. The Seller successfully proves the delivery on-chain.

### 3. Release (Approval & Payment)
*   The **Buyer (Client)** re-uploads the file downloaded from IPFS into the system.
*   The system hashes the uploaded file and **compares it with the on-chain hash**.
*   If the files match (meaning no manipulation occurred), the system gives the green light.
*   The Buyer signs again with Face ID, and the locked funds are instantly transferred to the Seller's account.

---

## 🛡 Privacy Track Claim

This project is fully compliant with the hackathon's **Privacy Track** guidelines.

Commercial contract terms, amounts, and agreement details are not recorded as **plaintext** on the public blockchain. Instead, a **Commitment Scheme** is utilized. Contract terms and a randomly generated 'salt' are combined and hashed with SHA-256 (`hash(terms + salt)`), and this hash is written to the `description` field of the Trustless Work contract. While only the parties who know the salt value can verify the contract, third parties monitoring the chain cannot see the commercial secrets.

---

## 💻 Setup and Execution

To test the project in your local environment:

```bash
# 1. Clone the repo and enter the directory
git clone <repo-url>
cd IBW26takim7

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Rename the .env.example file to .env and enter your Pinata/Stellar details.
cp .env.example .env

# 4. Start the development server
npm run dev
```

The application will be running at `http://localhost:5173`. First, create an account using **Register**, then experience the scenario by following the Deposit -> Deliver -> Release tabs.

---

## 🔐 Account & Identity Model

- **Deterministic wallet:** `username + password → PBKDF2 (100k iter) → Ed25519 keypair`. No seed phrase. The same credentials always generate the same wallet.
- **Server-side registry:** The `username → publicKey` mapping is kept in `data/users.json`. Username uniqueness is checked during registration; if the derived publicKey during login doesn't match the registered one, access is denied (distinguishes between wrong password / non-existent user).
- **Escrow accounting:** Each escrow is tracked in `data/escrows.json` with `buyer / seller / amount / status`. The Release action can only be performed by the buyer who funded the escrow, the exact locked amount is transferred, and double-releases are prevented.

## 🔬 Zero-Knowledge Layer (Circom + Groth16)

In addition to AES encryption, a **real zk-SNARK** layer has been added: the buyer can prove that the escrow amount is within an agreed range — without revealing the amount itself.

**Pipeline:**
1. **Circom circuit** (`zk/circuits/amount_proof.circom`): Encodes the `commitment = Poseidon(amount, salt)` **AND** `min ≤ amount ≤ max` constraints.
2. **Groth16 trusted setup** (snarkjs): powers-of-tau + circuit-specific zkey + verification key.
3. **Browser-side proof generation** (`src/lib/zk/prover.ts`): Proof is generated in ~270ms without the secret amount ever leaving the device.
4. **Server-side verification** (`/api/zk/verify`): The proof + public signals (commitment, min, max) are verified — the server never sees the amount.

**Demo:** `/zk` page. Enter a secret amount → generate Groth16 proof in the browser → verify on the server. The circuit constraint mathematically prevents proof generation for out-of-range amounts.

**Next step (on-chain):** Currently, verification is server-side (snarkjs). With Stellar Protocol 22+ BLS12-381 host functions, a Soroban Groth16 verifier contract can be written — the circuit would be migrated from bn128 to bls12-381 (requiring a field-agnostic commitment instead of circomlib's Poseidon).

## ⚠️ Known Limitations (Hackathon Scope)

- **Server-side signing:** The user's `secretKey` is sent to server endpoints for signing. This route was chosen due to Stellar SDK polyfill conflicts in the browser. In production, signing should be done entirely client-side (or with real Passkey/WebAuthn).
- **Passkey simulation:** `smart-account-kit` is installed, but the biometric signature is currently simulated (deterministic SHA-256). Actual WebAuthn integration requires contract infrastructure (`accountWasmHash`, `webauthnVerifierAddress`).
- **Single escrow vault:** All escrows are kept in a single testnet vault account; accounting is done via a record file (off-chain). In production, each escrow should be isolated at the Soroban contract level (the core model of Trustless Work).
- **Local JSON storage:** Files under `data/` are not a database; they are suitable only for a single server instance.
