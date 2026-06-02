# Emanet — Proje Tanıtım Belgesi

---

## Giriş

Serbest çalışanların yüzde yetmişi hayatında en az bir kez şunu yaşadı: teslim etti, para gelmedi. Ya da tam tersi: müşteri ödedi, iş hiç gelmedi.

Bu güven problemi. Şu an çözümü üç şey:

*Upwork* — %20 kesiyor, haftalar boyunca parayı tutuyor, hesabınızı istediği an kapatıyor.
*Banka havalesi* — SWIFT bekliyorsunuz. 3-5 gün, yüksek komisyon.
*Güven* — birisi risk alıyor. Çoğunlukla satıcı kaybediyor.

Biz bu üçünü de yapmıyoruz.

---

## Ne Yapıyoruz

Stellar ekosisteminde battle-tested escrow altyapısı olan *Trustless Work* üzerine dijital hizmet ticaretinin eksik katmanlarını inşa ediyoruz.

Trustless Work parayı kilitliyor. Biz şunu ekliyoruz:

- *Teslim kanıtını* — "teslim ettim" değil, "kriptografik olarak kanıtladım"
- *Ticari gizliliği* — koşullar zincirde plaintext durmuyor
- *Kripto bilgisi gerektirmeyen erişimi* — Face ID ile işlem imzalama

---

## Mimari

```text
┌─────────────────────────────────────────┐
│           Reference App                 │
│        (Passkey Kit / SvelteKit)        │
├──────────────────┬──────────────────────┤
│ Evidence Protocol│   Privacy Layer      │
│ (IPFS + hash)    │   (commitment scheme)│
├──────────────────┴──────────────────────┤
│         Passkey Adapter                 │
│    (seed phrase olmadan imzalama)       │
├─────────────────────────────────────────┤
│           Trustless Work                │
│      Escrow Primitive (mevcut)          │
└─────────────────────────────────────────┘
```

Tekerleği yeniden icat etmedik. Tekerleği normal insanların sürebileceği bir arabaya koyduk.

---

## Nasıl Çalışıyor

*1. Alıcı ödemeyi kilitler*
Koşullar SHA-256 ile hash'lenir, zincire yazılır — plaintext görünmez. Miktar USDC olarak Trustless Work kontratına kilitlenir. Alıcı Face ID ile imzalar. Seed phrase yok.

*2. Satıcı güvence görür, işe başlar*
Fonun kilitli olduğu zincirde anlık görünür.

*3. Satıcı teslim eder ve kanıtlar*
Dosya IPFS'e yüklenir. SHA-256 hash'i Trustless Work'ün milestone evidence alanına yazılır. Satıcı "teslim ettim" demez — hash ile kanıtlar.

*4. Alıcı doğrular ve onaylar*
Aldığı dosyanın hash'ini zincirdekiyle karşılaştırır. Eşleşirse Face ID ile onaylar. Trustless Work ödemeyi saniyeler içinde geçirir.

*5. Anlaşmazlık olursa*
Trustless Work'ün yerleşik dispute_resolver mekanizması devreye girer.

---

## Üç Katman — Teknik Detay

### Evidence Protocol

```typescript
// evidence.ts
async function uploadEvidence(file: File) {
  const cid = await pinata.upload(file)
  const hash = sha256(await file.arrayBuffer())
  return { cid, hash }
}

async function verifyEvidence(file: File, storedHash: string) {
  const hash = sha256(await file.arrayBuffer())
  return hash === storedHash
}
```

Trustless Work'ün milestone evidence alanına hash yazılır. Herhangi bir IPFS gateway üzerinden dosya alınır, hash karşılaştırılır.

### Privacy Layer — Commitment Scheme

```typescript
// privacy.ts
function commitTerms(terms: string, salt: string): string {
  return sha256(terms + salt)
}
```

Anlaşma koşulları hash'lenerek Trustless Work'ün description alanına yazılır. Zincirde plaintext bulunmaz. Taraflar salt'ı bilerek orijinal koşulları doğrulayabilir, başkası göremez.

### Passkey Adapter

```typescript
// passkey-adapter.ts
async function signWithPasskey(transaction: Transaction)
async function registerPasskey(userId: string)
async function getPasskeyPublicKey(): string
```

Kullanıcı Face ID veya parmak iziyle Stellar işlemini imzalar. Freighter yok, seed phrase yok, private key yok. Passkey Kit template üzerine inşa edilmiş.

### Trustless Work SDK Wrapper

```typescript
// tw-client.ts
export const tw = {
  fundEscrow(buyer, seller, amount, termsHash, token),
  setEvidence(escrowId, evidenceHash),
  releaseEscrow(escrowId),
  getEscrow(escrowId),
}
```

Trustless Work fonksiyonlarını tek yerden çağrılabilir hale getirir. Frontend doğrudan bu wrapper'ı kullanır.

---

## Trustless Work'ten Farkımız

| Özellik | Trustless Work | Emanet |
|---|---|---|
| Teslimat kanıtı (IPFS hash) | Yok | Var |
| Ticari gizlilik | Yok | Commitment scheme |
| Passkey / biyometrik onay | Yok | Var |
| Kripto bilgisi gerektiriyor mu | Evet | Hayır |

---

## Ekosistem Rakipleri

*Trustless Work* — Escrow primitive, EaaS. Bizim temelimiz, rakibimiz değil.
*Eascrow* — Basit Stellar escrow. Evidence hash yok, Passkey yok, privacy yok.

---

## Hackathon Stratejisi

*Ana Parkur — Sınır Ötesi Ödeme*
Hızlı, komisyonsuz, USDC ile cross-border settlement. Soroban tabanlı.

*Privacy Parkuru — Ticari Gizlilik*
Koşullar SHA-256 ile commit ediliyor. Zincirde plaintext bulunmuyor. Seçici ifşa: taraflar salt ile doğrulayabilir, başkası göremez.

---

## İş Modeli

*%0.5 işlem ücreti*
Upwork'ün 40'ta biri. Ölçeklenebilir.

*Premium hakem ağı*
Profesyonel dispute resolution. Yüksek değerli işlemler için.

*B2B API lisansı*
Başka platformlar bu infrastructure'ı kendi ürünlerine gömer. Aylık SaaS.

---

## Demo Senaryosu — 90 Saniye

0:00  "Üç hafta çalıştınız. Teslim ettiniz. Para gelmedi."

0:15  Alice telefonu kaldırıyor → Face ID → USDC kilitlendi
      [koşullar hash'lenmiş, zincirde görünüyor]

0:35  Bob dosyayı yüklüyor → IPFS → hash zincire yazıldı
      [Trustless Work milestone güncellendi]

1:00  Alice hash'i doğruluyor → Face ID → ödeme geçti
      [5 saniye, komisyon yok]

1:20  "Teslim ettim değil — kanıtladım."

---

# 16 Saatlik Plan — Final

---

### Faz 1 — Setup (0-2. saat)

| Kişi | İş |
|---|---|
| Rol A | Trustless Work testnet deploy — contract ID paylaş |
| Rol B | Passkey Kit fork, `npm install`, çalıştır |
| Rol C | Pinata hesabı aç, IPFS test yüklemesi yap |
| Rol D | Repo kur, env variables, demo senaryosu taslağı |

**Saat 2'de:** Contract ID'si var, template çalışıyor, IPFS bağlı.

---

### Faz 2 — Build (2-10. saat)

**Rol A (Saat 2-10):**
Trustless Work JavaScript SDK wrapper:
```typescript
export const tw = {
  fundEscrow(buyer, seller, amount, termsHash, token),
  setEvidence(escrowId, evidenceHash),
  releaseEscrow(escrowId),
  getEscrow(escrowId),
}
```
Test et. Frontend'ciler bunu çağıracak.

**Rol B (Saat 2-10):**
Üç ekran:
```text
1. Deposit — miktar, karşı taraf, koşul gir → Face ID → kilitlendi
2. Deliver — dosya yükle → IPFS → hash zincire → "teslim ettim"
3. Release — hash doğrula → Face ID → ödeme geçti
```

**Rol C (Saat 2-10):**
İki utility, başka bir şey değil:
```typescript
// evidence.ts
async function uploadEvidence(file) {
  const cid = await pinata.upload(file)
  const hash = sha256(await file.arrayBuffer())
  return { cid, hash }
}
async function verifyEvidence(file, storedHash) {
  return sha256(await file.arrayBuffer()) === storedHash
}

// privacy.ts
function commitTerms(terms, salt) {
  return sha256(terms + salt)  // description alanına gidiyor
}
```

**Rol D (Saat 2-10):**
Rol B'nin ekranlarını Rol A'nın SDK'sına bağla. Her buton basışında ne olması lazım, ne dönmesi lazım — bunları yaz, Rol B'ye ver.

---

### Faz 3 — Entegrasyon (10-14. saat)

**Tüm ekip.**

Saat 10-12: Uçtan uca akış:
```text
Alice → deposit (Passkey) → USDC kilitlendi ✓
Bob → dosya yükle → hash zincire ✓  
Alice → hash doğrula → release (Passkey) ✓
Ödeme geçti ✓
```

Saat 12-14: Çıkan hatalar. Öncelik sırası:
1. Deposit çalışsın
2. Release çalışsın
3. Evidence hash görünsün
4. Commitment scheme görünsün

---

### Faz 4 — Demo + Submission (14-16. saat)

**Saat 14-15:** Demo 3 kez çalıştırın. Testnet gecikmelerini öğrenin.

**Saat 15-16:** README + submission. Privacy Track için tek cümle ekleyin: *"Ticari koşullar SHA-256 ile commit ediliyor, zincirde plaintext bulunmuyor."*

---

**Tek kural:**

12. saatte deposit → release çalışmıyorsa evidence ve privacy bırakılır. Çalışan basit demo her zaman kazanır.

Seviyeleri yazın.
