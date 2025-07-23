import * as borsh from "borsh";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { describe, it, expect, test } from "bun:test";

class CounterAccount {
  count = 0;
  constructor({ count }: { count: number }) {
    this.count = count;
  }
}

const schema: borsh.Schema = {
  struct: {
    count: "u32",
  },
};

const GREETING_ACCOUNT_SIZE = borsh.serialize(
  schema,
  new CounterAccount({ count: 0 })
).length;

const adminKeyPair = Keypair.generate();
const counterKeyPair = Keypair.generate();
const connection = new Connection("http://localhost:8899", "confirmed");
const programId = new PublicKey("EQ46cykdBXa9je65PeA4P6Uv5aXb9wJWNtf3jAckYzQ4");

test("counter setup", async () => {
  const res = await connection.requestAirdrop(
    adminKeyPair.publicKey,
    2 * LAMPORTS_PER_SOL
  );
  await connection.confirmTransaction(res);

  const lamports = await connection.getMinimumBalanceForRentExemption(
    GREETING_ACCOUNT_SIZE
  );

  const createCounterAccIx = SystemProgram.createAccount({
    fromPubkey: adminKeyPair.publicKey,
    lamports,
    newAccountPubkey: counterKeyPair.publicKey,
    programId: programId,
    space: GREETING_ACCOUNT_SIZE,
  });

  const tx = new Transaction();
  tx.add(createCounterAccIx);

  const txHash = await connection.sendTransaction(tx, [
    adminKeyPair,
    counterKeyPair,
  ]);
  await connection.confirmTransaction(txHash);

  const counterAccount = await connection.getAccountInfo(
    counterKeyPair.publicKey
  );
  if (!counterAccount) {
    throw new Error("Counter account not found");
  }
  const counter = borsh.deserialize(
    schema,
    counterAccount.data
  ) as CounterAccount;
  console.log(counter.count);
  expect(counter.count).toBe(0);
});

test("increment counter", async () => {
  const tx = new Transaction();
  tx.add({
    keys: [
      { pubkey: counterKeyPair.publicKey, isSigner: true, isWritable: true },
    ],
    programId,
    data: Buffer.from(new Uint8Array([0, 1, 0, 0, 0])), // Increment instruction
  });

  const txHash = await connection.sendTransaction(tx, [
    adminKeyPair,
    counterKeyPair,
  ]);
  await connection.confirmTransaction(txHash);
  console.log("Transaction confirmed:", txHash);

  const counterAccount = await connection.getAccountInfo(
    counterKeyPair.publicKey
  );
  if (!counterAccount) {
    throw new Error("Counter account not found");
  }
  const counter = borsh.deserialize(
    schema,
    counterAccount.data
  ) as CounterAccount;
  console.log(counter.count);
  expect(counter.count).toBe(1);
});

test("decrement counter", async () => {
  const tx = new Transaction();
  tx.add({
    keys: [
      { pubkey: counterKeyPair.publicKey, isSigner: true, isWritable: true },
    ],
    programId,
    data: Buffer.from(new Uint8Array([1, 1, 0, 0, 0])),
  });

  const txHash = await connection.sendTransaction(tx, [
    adminKeyPair,
    counterKeyPair,
  ]);
  await connection.confirmTransaction(txHash);
  console.log("Transaction confirmed:", txHash);

  const counterAccount = await connection.getAccountInfo(
    counterKeyPair.publicKey
  );
  if (!counterAccount) {
    throw new Error("Counter account not found");
  }
  const counter = borsh.deserialize(
    schema,
    counterAccount.data
  ) as CounterAccount;
  console.log(counter.count);
  expect(counter.count).toBe(0);
});
