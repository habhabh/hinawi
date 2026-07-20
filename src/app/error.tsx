"use client";
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) { return <main id="main" className="login-page"><section className="login-card"><h1>تعذر تحميل الصفحة</h1><p className="muted">حدث خلل مؤقت. حاول مرة أخرى.</p><button className="button button-primary" onClick={reset}>إعادة المحاولة</button></section></main>; }
