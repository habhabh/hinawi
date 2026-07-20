import Link from "next/link";
import { notFound } from "next/navigation";
import { SellerEditForm } from "@/components/admin/edit-forms";
import { getSellerEditor } from "@/db/queries/admin";

export default async function SellerEditorPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const data = await getSellerEditor(id);
  if (!data) notFound();
  return <><div className="page-title"><div><span className="eyebrow">تحرير صفحة البائع</span><h1>{data.seller.name}</h1></div><Link className="button" href="/admin/sellers">العودة للبائعين</Link></div>{query.saved === "1" && <p className="save-notice" role="status">تم حفظ صفحة البائع وتحديث الواجهة.</p>}<SellerEditForm data={data} /></>;
}
