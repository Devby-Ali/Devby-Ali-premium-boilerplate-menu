import { listPageMetadata } from "./metadata";
import { ListPageClient } from "./list-page-client";

export const metadata = listPageMetadata;

export default function ListPage() {
  return <ListPageClient />;
}
