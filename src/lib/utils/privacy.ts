/**
 * Generates a SHA-256 hash for the given terms and salt using the Web Crypto API
 * This can be used on the client-side as well.
 */
export async function commitTerms(terms: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(terms + salt);
  
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}
