# النشر على Render من GitHub

المشروع مجهز كـRender Blueprint في ملف `render.yaml`. ينشئ المورد تلقائياً:

- خدمة Docker واحدة تشغل Next.js ومعالج الوسائط معاً لتقليل التكلفة.
- PostgreSQL 17 مُدارة على الشبكة الخاصة.
- قرصًا دائمًا للوسائط على `/data/media`.
- أسرار المصادقة والتحليلات والمهام المجدولة بقيم عشوائية.
- migrations وseed وحساب `super_admin` قبل بدء الموقع.
- النطاق `show.alhennawi.sa` وفحص الصحة `/api/health`.

## الإنشاء لأول مرة

1. ارفع الفرع `main` إلى GitHub، وتأكد من نجاح GitHub Actions.
2. افتح Render ثم اختر **New → Blueprint**.
3. اربط حساب GitHub واختر مستودع `hinawi`.
4. يتعرف Render تلقائياً على `render.yaml`. اضغط **Apply**.
5. سيطلب Render قيمة `SUPER_ADMIN_PASSWORD` فقط. أدخل كلمة مرور قوية لا تقل عن 12 محرفاً واحفظها في مدير كلمات المرور.
6. وافق على إنشاء خدمة Starter وقاعدة Basic وقرص الوسائط؛ هذه موارد مدفوعة ومناسبة للإنتاج.
7. انتظر حتى تصبح قاعدة البيانات والخدمة بحالة **Live**. يبدأ التطبيق تلقائياً بهذا الترتيب:

```text
migrations → seed → إنشاء المدير → web + media worker
```

سجل الدخول من:

```text
https://show.alhennawi.sa/admin/login
```

بالبريد `ali.ogmd@gmail.com` وكلمة المرور التي أدخلتها أثناء إنشاء الـBlueprint.

## ربط النطاق

سيظهر النطاق في صفحة الخدمة تحت **Settings → Custom Domains**. انسخ سجل DNS الذي يعرضه Render إلى مزود DNS للنطاق، واحذف أي سجل قديم يوجه `show.alhennawi.sa` إلى خادم Coolify. بعد انتشار DNS يصدر Render شهادة TLS تلقائياً.

لا تغيّر `APP_URL` أو `BETTER_AUTH_URL` أو `BETTER_AUTH_TRUSTED_ORIGINS`؛ جميعها مضبوطة على `https://show.alhennawi.sa`.

## التحديثات والبيانات

بعد كل `git push` ينتظر Render نجاح فحوص GitHub Actions، ثم يبني وينشر تلقائياً. قاعدة البيانات والوسائط لا تُحذف عند إعادة النشر. لا تحذف `hinawi-db` أو قرص `hinawi-media` عند تعديل الخدمة.

لا تستخدم خطة PostgreSQL المجانية للإنتاج؛ تنتهي بعد 30 يوماً ولا توفر نسخاً احتياطية. القرص الدائم يحتاج خدمة Render مدفوعة، ولا يمكن مشاركته بين خدمتين، ولذلك يعمل الـworker داخل خدمة الويب نفسها.

