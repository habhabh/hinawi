import { adminLists } from "@/db/queries/admin";
import { env } from "@/lib/env";
import { isPublicDeploymentUrl } from "@/lib/seo";

export default async function QrPage() {
  const rows = await adminLists.qr();
  const validAppUrl = isPublicDeploymentUrl(env.APP_URL);
  return (
    <>
      <h1>روابط QR</h1>
      <p className="muted">الرموز ثابتة حتى عند تغيير رابط البائع، وتفتح صفحة البائع على نفس الدومين الذي تم مسح الرمز منه.</p>
      {!validAppUrl && (
        <p className="save-notice save-notice-error" role="alert">
          إعداد APP_URL غير صالح للإنتاج. غيّره في Coolify إلى https://show.alhennawi.sa ثم أعد النشر.
        </p>
      )}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>البائع</th>
              <th>الحالة</th>
              <th>المسحات</th>
              <th>آخر مسح</th>
              <th>الرابط</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ qr, sellerName }) => (
              <tr key={qr.id}>
                <td>{sellerName}</td>
                <td>{qr.isActive ? "فعال" : "معطل"}</td>
                <td>{qr.scanCount}</td>
                <td>{qr.lastScannedAt?.toLocaleString("ar-SA") || "—"}</td>
                <td><a href={`/q/${qr.token}`} target="_blank">فتح الرابط</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
