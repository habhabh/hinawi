import Link from "next/link";
export default function NotFound() { return <main id="main" className="login-page"><section className="login-card"><span className="eyebrow">404</span><h1>الصفحة غير متاحة</h1><p className="muted">ربما تم تعطيل المحتوى أو تغير رابطه.</p><Link href="/" className="button button-primary">العودة للرئيسية</Link></section></main>; }
