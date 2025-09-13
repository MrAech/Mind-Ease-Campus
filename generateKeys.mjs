import { exportJWK, exportPKCS8, generateKeyPair } from "jose";

const keys = await generateKeyPair("RS256", {
  extractable: true,
});
const privateKey = await exportPKCS8(keys.privateKey);
const publicKey = await exportJWK(keys.publicKey);
const jwks = JSON.stringify({ keys: [{ use: "sig", ...publicKey }] });

const pkSingleLine = privateKey.trimEnd().replace(/\n/g, " ");
process.stdout.write('JWT_PRIVATE_KEY="' + pkSingleLine + '"\n');
process.stdout.write("JWKS=" + jwks + "\n");
