import { redirect } from "next/navigation";

export default async function SellerCategoryPage({ params }: { params: Promise<{ sellerSlug: string; categorySlug: string }> }) {
  const { sellerSlug, categorySlug } = await params;
  redirect(`/s/${sellerSlug}?category=${encodeURIComponent(categorySlug)}`);
}
