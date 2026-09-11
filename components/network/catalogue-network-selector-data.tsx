import { CatalogueNetworkSelector } from "@/components/network/catalogue-network-selector";
import { getSelectedCatalogueNetwork } from "@/lib/network/selection";

export async function CatalogueNetworkSelectorData({
  mobile = false,
}: Readonly<{ mobile?: boolean }>) {
  const network = await getSelectedCatalogueNetwork();

  return (
    <CatalogueNetworkSelector initialNetwork={network} mobile={mobile} />
  );
}
