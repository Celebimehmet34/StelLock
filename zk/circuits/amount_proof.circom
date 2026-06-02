pragma circom 2.0.0;

include "poseidon.circom";
include "comparators.circom";

/*
 * Emanet — Confidential Amount Proof
 *
 * Proves, in zero knowledge, that the escrow amount:
 *   1. matches the on-chain Poseidon commitment (binding), and
 *   2. lies within an agreed [minAmount, maxAmount] bracket
 * WITHOUT revealing the exact amount.
 *
 * Private inputs : amount, salt
 * Public inputs  : minAmount, maxAmount
 * Public output  : commitment   (Poseidon(amount, salt))
 *
 * Use case: a buyer proves "this escrow covers the agreed deal-size bracket"
 * to an arbiter or counterparty without disclosing the exact price.
 */
template AmountProof() {
    signal input amount;     // private
    signal input salt;       // private
    signal input minAmount;  // public
    signal input maxAmount;  // public

    signal output commitment;

    // 1. Commitment binds the secret amount + salt
    component h = Poseidon(2);
    h.inputs[0] <== amount;
    h.inputs[1] <== salt;
    commitment <== h.out;

    // 2. Range proof: minAmount <= amount <= maxAmount  (64-bit values)
    component geMin = GreaterEqThan(64);
    geMin.in[0] <== amount;
    geMin.in[1] <== minAmount;
    geMin.out === 1;

    component leMax = LessEqThan(64);
    leMax.in[0] <== amount;
    leMax.in[1] <== maxAmount;
    leMax.out === 1;
}

component main {public [minAmount, maxAmount]} = AmountProof();
