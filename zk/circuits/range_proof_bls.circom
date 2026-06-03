pragma circom 2.0.0;

include "comparators.circom";

/*
 * Emanet — Range Proof for BLS12-381 (Soroban on-chain verification)
 *
 * Proves that a secret amount lies within [minAmount, maxAmount]
 * WITHOUT revealing the exact amount.
 *
 * This circuit is designed for BLS12-381 curve (Soroban Protocol 22
 * bls12_381_multi_pairing_check). No Poseidon (its constants are
 * bn128-specific); the range proof itself is the ZK guarantee.
 *
 * Private inputs : amount
 * Public inputs  : minAmount, maxAmount
 */
template RangeProof() {
    signal input amount;      // private — never revealed
    signal input minAmount;   // public
    signal input maxAmount;   // public

    // amount >= minAmount
    component geMin = GreaterEqThan(64);
    geMin.in[0] <== amount;
    geMin.in[1] <== minAmount;
    geMin.out === 1;

    // amount <= maxAmount
    component leMax = LessEqThan(64);
    leMax.in[0] <== amount;
    leMax.in[1] <== maxAmount;
    leMax.out === 1;
}

component main {public [minAmount, maxAmount]} = RangeProof();
