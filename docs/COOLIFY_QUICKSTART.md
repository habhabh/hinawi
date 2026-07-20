# نشر آلي كامل على Coolify

استخدم `docker-compose.coolify.yml` بدلاً من إنشاء web وقاعدة البيانات والـworker كموارد منفصلة. ينشئ Stack واحد تلقائياً:

- PostgreSQL 17 مع volume دائمة.
- تطبيق Next.js مع volume دائمة للوسائط.
- Media Worker يشارك volume الوسائط نفسها.
- migrations وseed عربي قبل تشغيل الموقع.
- أول حساب `super_admin` بطريقة idempotent.
- مستخدم وكلمة مرور قاعدة البيانات وأسرار التطبيق وكلمة مرور المدير عبر Magic Variables من Coolify.

## إعداد المورد

من **New Resource → Application → GitHub App** اختر المستودع ثم أدخل:

| الحقل | القيمة |
|---|---|
| Repository | `hinawi` |
| Branch | `main` |
| Build Pack | `Docker Compose` |
| Base Directory | `/` |
| Docker Compose Location | `/docker-compose.coolify.yml` |

لا تختر Nixpacks أو Dockerfile لهذا المسار الآلي.

## القيم الوحيدة المطلوبة

بعد أن يقرأ Coolify ملف Compose سيعرض المتغيرات. اضبط:

```dotenv
APP_URL=https://your-domain.example
SUPER_ADMIN_EMAIL=your-email@example.com
SUPER_ADMIN_NAME=اسم المدير
```

`APP_URL` يجب أن يكون رابط HTTPS النهائي بدون `/` في النهاية. بقية القيم الأساسية يولدها Coolify تلقائياً، ومنها:

- `SERVICE_USER_POSTGRES`
- `SERVICE_PASSWORD_64_POSTGRES`
- `SERVICE_BASE64_64_AUTH`
- `SERVICE_BASE64_64_ANALYTICS`
- `SERVICE_BASE64_64_CRON`
- `SERVICE_PASSWORD_64_ADMIN`

احتفظ بالقيم المولدة ولا تغيّرها بعد بدء الاستخدام. كلمة مرور الدخول الأولى هي القيمة الظاهرة عند كشف `SERVICE_PASSWORD_64_ADMIN` في Environment Variables.

## النطاق والنشر

عيّن النطاق لخدمة `web` بهذا الشكل حتى يعرف Coolify أن المنفذ الداخلي هو 3000:

```text
https://your-domain.example:3000
```

المنفذ `3000` هنا داخلي فقط؛ الزائر يستخدم HTTPS العادي دون كتابة المنفذ. لا تعيّن domain لخدمتي `postgres` أو `media-worker` ولا تنشر منافذ لهما.

اضغط **Deploy**. تسلسل البداية تلقائي:

```text
PostgreSQL healthy → migrations → seed → super admin → web healthy → media worker
```

أول بناء أبطأ من التحديثات لأنه يبني صورة Node ويثبت FFmpeg. بعد النجاح افتح `/api/health` ثم `/admin/login`.

## الاستمرارية والتحديثات

`postgres-data` و`media-data` معرفتان كـnamed volumes داخل Stack؛ تحديث الصورة أو إعادة تشغيل الخدمات لا يحذف البيانات. لا تستخدم **Delete Storage** أو حذف volumes عند إعادة النشر. migrations وseed وإنشاء المدير آمنة للتشغيل المتكرر، ولا يعاد ضبط كلمة مرور مدير موجود.

فعّل Auto Deploy من GitHub بعد نجاح أول نشر. فعّل أيضاً نسخة احتياطية خارج الخادم لقاعدة البيانات ووسائط `/data/media`؛ الـvolume تحمي من إعادة النشر لكنها ليست نسخة احتياطية ضد فقد الخادم.
