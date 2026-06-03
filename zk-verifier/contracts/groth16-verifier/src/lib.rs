#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, vec, log,
    Env, BytesN, Vec,
    crypto::bls12_381::{Bls12381Fr, Bls12381G1Affine, Bls12381G2Affine},
};

/// Groth16 on-chain verifier for Emanet's BLS12-381 range proof.
///
/// Uses Soroban Protocol 22 BLS12-381 host functions:
///   g1_add, g1_mul, pairing_check
///
/// Verification equation (multi-pairing):
///   e(-A, B) · e(alpha, beta) · e(vk_x, gamma) · e(C, delta) == 1
///
/// vk_x = IC[0] + IC[1]*pub[0] + IC[2]*pub[1]

// ── Hex const helper ──────────────────────────────────────────────────────

const fn hx(c: u8) -> u8 {
    match c {
        b'0'..=b'9' => c - b'0',
        b'a'..=b'f' => c - b'a' + 10,
        b'A'..=b'F' => c - b'A' + 10,
        _ => 0,
    }
}

const fn hexd<const N: usize>(s: &[u8]) -> [u8; N] {
    let mut o = [0u8; N];
    let mut i = 0;
    while i < N { o[i] = hx(s[i*2]) << 4 | hx(s[i*2+1]); i += 1; }
    o
}

// ── Verification Key (from BLS12-381 trusted setup) ───────────────────────

const ALPHA: [u8; 96] = hexd::<96>(b"0332bc8cc28d05ff9e51bdb686a26ba7038d316d946940d84a51bd2b11a7fd42236804a07b6f0743db218b94ef7257ee120e6b6088dcb3b9bd1160f4371bdb699d06e1ff0d26f640c9128a65058ca7c2c2a5feb99100c8d769a025743322b795");
const BETA: [u8; 192] = hexd::<192>(b"18332f4c4832e479f89039c1f4fdf048121edafb82a91d44bdcf61e7608b49ff48ea66b05bed55395201bd98fcf3ce73097d6e7963fc894de9bb15b84198f93583ad50b6cc47407099d6c728d6b8d16de17404b8a7ba7bd756cd74747b9c48600cc7c0a70f697176a226cbc708b56f842d6c617635ef8bc960ca4ba14b461490dc16e3bf8ac8a5fd1d36d4e940b87b440e5db2a88baba83a45dee1c086ce7f7b912099dcfe093883e81a6a603a641969ec92ba3fd9e1fb6a9f71182ac09fc244");
const GAMMA: [u8; 192] = hexd::<192>(b"13e02b6052719f607dacd3a088274f65596bd0d09920b61ab5da61bbdc7f5049334cf11213945d57e5ac7d055d042b7e024aa2b2f08f0a91260805272dc51051c6e47ad4fa403b02b4510b647ae3d1770bac0326a805bbefd48056c8c121bdb80606c4a02ea734cc32acd2b02bc28b99cb3e287e85a763af267492ab572e99ab3f370d275cec1da1aaa9075ff05f79be0ce5d527727d6e118cc9cdc6da2e351aadfd9baa8cbdd3a76d429a695160d12c923ac9cc3baca289e193548608b82801");
const DELTA: [u8; 192] = hexd::<192>(b"076c91a5a7648d0b48f5fd3d83bea87e3a72a2e1f47f6412da9a122235b6a4ce65ce081b9e9abd8d8a6912f4f54f9ffb0861550a8479e0b0a1fa1f05a429b807323ca9394884c98187721c392aa34a051b4f0455ac41a92013a119252f3a81a80cc9a5c4a49cf66d909fc74fce6067eaf7e7055fb70c0f32fe520117b040a23bdd82fcd89ff938f9d3e1d80328ff69f90b67cc898eae86780d1203c0b1d49af73bcb03350a98c131f794eccca0bf1cb6fde1b277240a7be49210e0cd146f1598");
const IC0: [u8; 96] = hexd::<96>(b"009835353868d0547d365306b1ffeaddfc8914719666e9a6b0f6942ce5d388f7fc613e5ddeb972e224b31ae80e87a125192b07fbc25b143bd59876f6f2ce47c5ce13d0fbc6473172144121daf1a911c98ee3ce550b4de646654dd9f2d26aeafd");
const IC1: [u8; 96] = hexd::<96>(b"02821d3d846566ba059e2e47241542a26dca16979fa0710cb6281ec776db2ee7b2b19f30b2b2e05ae3391a35c4106ed20dc4362eea48eea02242c22d612c024a40a36337039d5b201bfeb325f003b5c1b378674e57c9583ce10adf60be869486");
const IC2: [u8; 96] = hexd::<96>(b"08577dadac25f0f7e01a718ec779fc2b3f00f079bce679eb4717c5e89358c26368caee3a9959ac7fc367b2a1e7abaf0604a19f42ba665b347aaeb333c50ecd2d0a9ef8295512780412c6516be9dc203d21cbecd20bb3bdeb103f2dd0d0bb8fb4");

// ── Contract ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct ProofResult {
    pub verified: bool,
    pub min_amount: u64,
    pub max_amount: u64,
}

#[contract]
pub struct Groth16Verifier;

#[contractimpl]
impl Groth16Verifier {
    /// Verify a Groth16 BLS12-381 range proof on-chain.
    ///
    /// # Arguments
    /// * `proof_a` — G1 affine point (96 bytes)
    /// * `proof_b` — G2 affine point (192 bytes)
    /// * `proof_c` — G1 affine point (96 bytes)
    /// * `pub_min` — public signal: minimum amount
    /// * `pub_max` — public signal: maximum amount
    /// Debug: multiply a G1 point by a scalar, return result bytes.
    /// Used to isolate serialization issues.
    pub fn dbg_mul(env: Env, point: BytesN<96>, scalar: u64) -> BytesN<96> {
        let bls = env.crypto().bls12_381();
        let p = Bls12381G1Affine::from_bytes(point);
        let s = u64_to_fr(&env, scalar);
        let r = bls.g1_mul(&p, &s);
        r.to_bytes()
    }

    pub fn verify(
        env: Env,
        proof_a: BytesN<96>,
        proof_b: BytesN<192>,
        proof_c: BytesN<96>,
        pub_min: u64,
        pub_max: u64,
    ) -> ProofResult {
        let bls = env.crypto().bls12_381();

        // Convert proof points to typed structs
        let a = Bls12381G1Affine::from_bytes(proof_a.clone());
        let b = Bls12381G2Affine::from_bytes(proof_b);
        let c = Bls12381G1Affine::from_bytes(proof_c);

        // Convert public signals to BLS12-381 field elements
        let s1 = u64_to_fr(&env, pub_min);
        let s2 = u64_to_fr(&env, pub_max);

        // Load verification key points
        let alpha = Bls12381G1Affine::from_bytes(BytesN::from_array(&env, &ALPHA));
        let beta  = Bls12381G2Affine::from_bytes(BytesN::from_array(&env, &BETA));
        let gamma = Bls12381G2Affine::from_bytes(BytesN::from_array(&env, &GAMMA));
        let delta = Bls12381G2Affine::from_bytes(BytesN::from_array(&env, &DELTA));
        let ic0   = Bls12381G1Affine::from_bytes(BytesN::from_array(&env, &IC0));
        let ic1   = Bls12381G1Affine::from_bytes(BytesN::from_array(&env, &IC1));
        let ic2   = Bls12381G1Affine::from_bytes(BytesN::from_array(&env, &IC2));

        // Compute vk_x = IC[0] + IC[1]*s1 + IC[2]*s2
        let t1 = bls.g1_mul(&ic1, &s1);
        let t2 = bls.g1_mul(&ic2, &s2);
        let vk_x = bls.g1_add(&ic0, &t1);
        let vk_x = bls.g1_add(&vk_x, &t2);

        // Negate A using the native Neg impl (flips y-coordinate)
        let neg_a = -a;

        // Multi-pairing check:
        // e(-A, B) · e(alpha, beta) · e(vk_x, gamma) · e(C, delta) == 1
        let g1_vec: Vec<Bls12381G1Affine> = vec![&env, neg_a, alpha, vk_x, c];
        let g2_vec: Vec<Bls12381G2Affine> = vec![&env, b, beta, gamma, delta];

        let ok = bls.pairing_check(g1_vec, g2_vec);

        log!(&env, "Groth16 on-chain verified: {}", ok);

        ProofResult {
            verified: ok,
            min_amount: pub_min,
            max_amount: pub_max,
        }
    }
}

/// Convert u64 → BLS12-381 scalar field element (32 bytes big-endian)
fn u64_to_fr(env: &Env, val: u64) -> Bls12381Fr {
    let mut buf = [0u8; 32];
    buf[24..32].copy_from_slice(&val.to_be_bytes());
    Bls12381Fr::from_bytes(BytesN::from_array(env, &buf))
}

mod test;
