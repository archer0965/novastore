import { redirect } from "next/navigation";

/** Alias for /p/[sellerId] — some docs refer to /pay/[seller_id]. */
export default function PayAliasPage({
  params,
}: {
  params: { sellerId: string };
}) {
  redirect(`/p/${params.sellerId}`);
}
