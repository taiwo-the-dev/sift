import "server-only";

import { cookies } from "next/headers";

import {
  catalogueNetworkCookie,
  defaultCatalogueNetwork,
  parseCatalogueNetwork,
} from "@/features/network/selection";
import type { SupportedBnbNetwork } from "@/lib/blockchain/chains";

export async function getSelectedCatalogueNetwork(): Promise<SupportedBnbNetwork> {
  const cookieStore = await cookies();

  return (
    parseCatalogueNetwork(cookieStore.get(catalogueNetworkCookie)?.value) ??
    defaultCatalogueNetwork
  );
}
