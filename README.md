# Emanet — B2B Escrow Infrastructure

*"Trustless Work escrow'unun üzerine verifiable delivery, ticari gizlilik ve kripto bilgisi gerektirmeyen erişim katmanı."*

Emanet, serbest çalışanlar (freelancer) ve müşteriler arasındaki "teslim ettim para gelmedi" veya "parayı ödedim iş gelmedi" şeklindeki güven problemini çözmeyi hedefleyen; Stellar ağı ve Trustless Work altyapısı üzerine inşa edilmiş yeni nesil bir B2B ödeme (escrow) altyapısıdır. 

---

## 🚀 Öne Çıkan Özellikler

Emanet, basit bir akıllı sözleşme uygulamasından öte, kullanıcı deneyimine odaklanan 3 temel katman ekler:

1. **Teslimat Kanıtı (Verifiable Delivery):** "İşi teslim ettim" demek yerine, teslim edilen dosyanın kendisi kriptografik olarak kanıtlanır (IPFS + SHA-256).
2. **Ticari Gizlilik (Privacy Layer - Commitment Scheme):** Taraflar arasındaki ticari koşullar düz metin (plaintext) olarak zincire yazılmaz. Koşullar tuzlanarak (salt) hash'lenir.
3. **Kripto Bilgisi Gerektirmeyen Erişim (Passkey):** Kullanıcıların *seed phrase* ezberlemesine veya eklenti cüzdan kurmasına gerek yoktur. İşlemler Face ID / Touch ID biyometrik verileri ile onaylanır.

---

## 🛠 Kullanılan Teknolojiler ve Mimari

Proje modern, hızlı ve güvenli bir teknoloji yığını (stack) kullanılarak geliştirilmiştir:

*   **SvelteKit:** Sistemin B2B arayüzünü (Reference App) simüle etmek için kullanılan son derece hızlı frontend framework'ü.
*   **Stellar Network & Trustless Work:** Temel escrow (emanet) mantığı, paranın kilitlenmesi ve serbest bırakılması süreçleri için.
*   **smart-account-kit:** Cüzdan altyapısını soyutlayarak (Account Abstraction) biyometrik imzalama (Passkey) süreçlerini yönetmek için.
*   **Pinata (IPFS):** Merkeziyetsiz, sansürlenemez ve güvenli dosya depolama altyapısı.
*   **Web Crypto API:** İstemci tarafında hızlı ve güvenli SHA-256 özetleme (hashing) işlemleri için.

---

## 🔄 Sistem Nasıl İşliyor? (3 Aşamalı Akış)

Sistem uçtan uca şu şekilde çalışır:

### 1. Deposit (Para Kilitleme)
*   **Alıcı (Müşteri)**, ödemek istediği USDC miktarını, karşı tarafı ve hizmet **koşullarını** girer.
*   Sistem koşulları `SHA-256(koşullar + salt)` formatında hash'ler.
*   Alıcı işlemi Face ID / Touch ID ile onaylar.
*   Miktar ve sadece hash'lenmiş koşul (Privacy Hash) Trustless Work sözleşmesine kilitlenir. Zincirde şeffaf veri bulunmaz.

### 2. Deliver (Teslimat ve Kanıt)
*   **Satıcı (Freelancer)** işi tamamladığında dosyayı sisteme yükler.
*   Dosya **IPFS ağına (Pinata)** yüklenir. Eş zamanlı olarak dosyanın SHA-256 özeti alınır.
*   Dosya hash'i (Evidence Hash) Trustless Work sözleşmesinin `evidence` alanına işlenir. Satıcı teslimatı zincir üzerinde kanıtlamış olur.

### 3. Release (Onay ve Ödeme)
*   **Alıcı (Müşteri)** IPFS'ten indirdiği dosyayı sisteme geri yükler.
*   Sistem yüklenen dosyanın hash'ini alır ve **zincirdeki hash ile karşılaştırır**.
*   Dosyalar eşleşirse (hiçbir manipülasyon yoksa) sistem yeşil ışık yakar.
*   Alıcı tekrar Face ID ile imza atar ve kilitli fonlar anında satıcının hesabına aktarılır.

---

## 🛡 Privacy Track (Gizlilik Parkuru) İddiası

Bu proje hackathon'un **Privacy Track** yönergelerine tamamen uygundur. 

Ticari sözleşme koşulları, miktar ve anlaşma detayları halka açık blok zincirine düz metin (**plaintext**) olarak kaydedilmez. Bunun yerine bir **Commitment Scheme** (Taahhüt Şeması) kullanılır. Sözleşme koşulları ve rastgele üretilen bir 'salt' birleştirilerek SHA-256 ile özetlenir (`hash(terms + salt)`) ve Trustless Work sözleşmesinin `description` alanına bu özet yazılır. Yalnızca salt değerini bilen taraflar sözleşmeyi doğrulayabilirken, zinciri izleyen 3. şahıslar ticari sırları göremez.

---

## 💻 Kurulum ve Çalıştırma

Projeyi yerel ortamınızda test etmek için:

```bash
# 1. Repoyu klonlayın ve dizine girin
git clone <repo-url>
cd IBW26takim7

# 2. Bağımlılıkları yükleyin
npm install

# 3. Ortam değişkenlerini ayarlayın
# .env.example dosyasının adını .env yapın ve içine Pinata/Stellar bilgilerinizi girin.
cp .env.example .env

# 4. Geliştirme sunucusunu başlatın
npm run dev
```

Uygulama `http://localhost:5173` adresinde çalışacaktır. Önce **Register** ile hesap oluşturun, ardından Deposit -> Deliver -> Release sekmelerini takip ederek senaryoyu deneyimleyebilirsiniz.

---

## 🔐 Hesap & Kimlik Modeli

- **Deterministik cüzdan:** `username + password → PBKDF2 (100k iter) → Ed25519 keypair`. Seed phrase yok. Aynı kimlik bilgileri her zaman aynı cüzdanı üretir.
- **Sunucu tarafı kayıt:** `username → publicKey` eşlemesi `data/users.json` içinde tutulur. Kayıtta username benzersizliği kontrol edilir; girişte türetilen publicKey kayıtlıyla eşleşmezse giriş reddedilir (yanlış şifre / olmayan kullanıcı ayrımı yapılır).
- **Escrow muhasebesi:** Her escrow `data/escrows.json` içinde `buyer / seller / amount / status` ile izlenir. Release yalnızca escrow'u fonlayan buyer tarafından yapılabilir, tam kilitlenen tutar gönderilir, çift release engellenir.

## 🔬 Zero-Knowledge Katmanı (Circom + Groth16)

AES şifrelemenin yanında, **gerçek bir zk-SNARK** katmanı eklendi: alıcı, escrow miktarının anlaşılan bir aralıkta olduğunu — miktarı ifşa etmeden — kanıtlayabiliyor.

**Pipeline:**
1. **Circom devresi** (`zk/circuits/amount_proof.circom`): `commitment = Poseidon(amount, salt)` **VE** `min ≤ amount ≤ max` kısıtlarını kodluyor.
2. **Groth16 trusted setup** (snarkjs): powers-of-tau + circuit-specific zkey + verification key.
3. **Tarayıcıda proof üretimi** (`src/lib/zk/prover.ts`): gizli miktar cihazdan hiç çıkmadan, ~270ms'de proof üretiliyor.
4. **Sunucuda doğrulama** (`/api/zk/verify`): proof + public sinyaller (commitment, min, max) doğrulanıyor — sunucu miktarı asla görmüyor.

**Demo:** `/zk` sayfası. Gizli miktar gir → tarayıcıda Groth16 proof üret → sunucuda doğrula. Aralık dışı miktar için devre kısıtı proof üretimini engelliyor (matematiksel garanti).

**Sonraki adım (on-chain):** Şu an doğrulama sunucu tarafında (snarkjs). Stellar Protocol 22+ BLS12-381 host fonksiyonlarıyla bir Soroban Groth16 verifier kontratı yazılabilir — devre bn128 yerine bls12-381'e taşınır (circomlib Poseidon yerine alan-bağımsız bir taahhüt gerekir).

## ⚠️ Bilinen Sınırlamalar (Hackathon kapsamı)

- **İmzalama sunucu tarafında:** Kullanıcı `secretKey`'i imzalama için sunucu endpoint'lerine gönderilir. Tarayıcıda Stellar SDK polyfill çakışması yaşandığı için bu yol seçildi. Üretimde imzalama tamamen istemci tarafında (veya gerçek Passkey/WebAuthn ile) yapılmalıdır.
- **Passkey simülasyonu:** `smart-account-kit` kurulu ancak biyometrik imza şu an simüle ediliyor (deterministik SHA-256). Gerçek WebAuthn entegrasyonu için kontrat altyapısı (`accountWasmHash`, `webauthnVerifierAddress`) gerekiyor.
- **Tek escrow vault:** Tüm escrow'lar tek bir testnet vault hesabında tutuluyor; muhasebe kayıt dosyasıyla (off-chain) yapılıyor. Üretimde her escrow Soroban kontratı seviyesinde izole edilmeli (Trustless Work'ün asıl modeli).
- **Yerel JSON depolama:** `data/` altındaki dosyalar bir veritabanı değil; tek sunucu örneği için uygundur.
