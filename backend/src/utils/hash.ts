import crypto from "crypto";

/**
 * Compute a hex SHA-256 digest of any string input.
 */
export function sha256(input: string): string {
  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Compute SHA-256 of a Buffer (e.g. raw file bytes).
 */
export function sha256Buffer(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Deterministic hash of a dataset metadata object.
 * Fields are sorted before serialisation to ensure stability.
 */
export function hashDatasetMetadata(meta: Record<string, unknown>): string {
  const sorted = Object.keys(meta)
    .sort()
    .reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = meta[k];
      return acc;
    }, {});
  return sha256(JSON.stringify(sorted));
}

/**
 * Return a "0x"-prefixed hex string (Ethereum style).
 */
export function toEthHex(hash: string): string {
  return hash.startsWith("0x") ? hash : `0x${hash}`;
}

/**
 * Verify that a given hash matches a string input.
 */
export function verifyHash(input: string, expected: string): boolean {
  const computed = sha256(input);
  return crypto.timingSafeEqual(
    Buffer.from(computed, "hex"),
    Buffer.from(expected.replace(/^0x/, ""), "hex")
  );
}
