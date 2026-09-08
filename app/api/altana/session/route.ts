import { getAddress, isHex, type Hex } from "viem";
import { z } from "zod";

import {
  altanaKeyId,
  altanaKeyStoreAbi,
  getAltanaNetwork,
} from "@/features/altana/protocol";
import { isHiringChainId } from "@/features/hiring/protocol";
import { getHiringPublicClient } from "@/lib/blockchain/hiring-client";

export const runtime = "nodejs";

const querySchema = z.object({
  chainId: z.coerce.number().int().refine(isHiringChainId),
  publicKey: z.string().min(4).max(300).refine((value) => isHex(value, { strict: true })),
  wallet: z.string().refine((value) => {
    try {
      getAddress(value);
      return true;
    } catch {
      return false;
    }
  }),
});

function json(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function GET(request: Request): Promise<Response> {
  try {
    const query = querySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    const chainId = query.chainId;
    if (!isHiringChainId(chainId)) {
      return json({ error: "This network is not supported." }, 400);
    }

    const network = getAltanaNetwork(chainId);
    const client = getHiringPublicClient(chainId);
    const wallet = getAddress(query.wallet);
    const publicKey = query.publicKey as Hex;
    const keyId = altanaKeyId(publicKey);
    const active = await client.readContract({
      address: network.keyStore,
      abi: altanaKeyStoreAbi,
      functionName: "isValidKey",
      args: [wallet, keyId],
    });

    if (active) {
      const registeredKey = await client.readContract({
        address: network.keyStore,
        abi: altanaKeyStoreAbi,
        functionName: "getPublicKey",
        args: [wallet, keyId],
      });
      if (registeredKey.toLowerCase() !== publicKey.toLowerCase()) {
        return json({ error: "The registered session key does not match." }, 409);
      }
    }

    return json({
      active,
      checkedAt: new Date().toISOString(),
      keyId,
      keyStore: network.keyStore,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ error: "Invalid session verification request." }, 400);
    }

    console.error("[altana] session verification failed", {
      error: error instanceof Error ? error.name : "UnknownError",
    });
    return json({ error: "Sift could not verify the session on BNB Chain." }, 502);
  }
}
