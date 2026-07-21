# نشر آلي كامل على Coolify

استخدم `docker-compose.coolify.yml` بدلاً من إنشاء web وقاعدة البيانات والـworker كموارد منفصلة. يبني GitHub Actions صورة التطبيق خارج خادم Hetzner، ثم يسحب Coolify الصورة الجاهزة من GHCR. ينشئ Stack واحد تلقائياً:

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

لا تختر Nixpacks أو Dockerfile لهذا المسار الآلي. ملف Compose لا يحتوي `build`، لذلك لا يشغّل Coolify تثبيت الحزم أو بناء Next.js على الخادم.

## إعداد صورة GitHub مرة واحدة

بعد أول Push ناجح إلى `main` افتح مستودع GitHub ثم **Packages → hinawi → Package settings** واجعل الصورة **Public**. البديل هو إضافة GitHub Container Registry إلى Coolify ببيانات دخول لها صلاحية `read:packages`.

الصورة الافتراضية هي:

```text
ghcr.io/habhabh/hinawi:latest
```

يبني CI الصورة ويفحصها ثم يرفع وسمين: `latest` ووسمًا ثابتًا برقم commit. لا تضغط Deploy قبل اكتمال GitHub Actions باللون الأخضر.

## القيم الوحيدة المطلوبة

بعد أن يقرأ Coolify ملف Compose سيعرض المتغيرات. اضبط:

```dotenv
APP_URL=https://your-domain.example
APP_IMAGE=ghcr.io/habhabh/hinawi:latest
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

اضغط **Deploy** بعد نجاح CI. تسلسل البداية تلقائي:

```text
PostgreSQL healthy → migrations → seed → super admin → web healthy → media worker
```

Coolify يسحب صورة Alpine واحدة جاهزة، ثم تستخدم خدمتا web والـworker الصورة نفسها. لا يحتوي خادم Hetzner أثناء النشر على عملية `pnpm install` أو `next build`، ولذلك يكون استهلاك المعالج والذاكرة محدودًا بفك الصورة وتشغيل الخدمات. لا تحتوي صورة التشغيل على TypeScript أو pnpm أو شجرة اعتماديات التطوير. بعد النجاح افتح `/api/health` ثم `/admin/login`.

## الاستمرارية والتحديثات

`postgres-data` و`media-data` معرفتان كـnamed volumes داخل Stack؛ تحديث الصورة أو إعادة تشغيل الخدمات لا يحذف البيانات. لا تستخدم **Delete Storage** أو حذف volumes عند إعادة النشر. migrations وseed وإنشاء المدير آمنة للتشغيل المتكرر، ولا يعاد ضبط كلمة مرور مدير موجود.

لا تفعّل Auto Deploy المباشر عند كل Push؛ قد يبدأ قبل أن ينتهي CI من رفع الصورة الجديدة. لديك خياران:

1. انتظر نجاح CI ثم اضغط **Redeploy** يدويًا.
2. انسخ Deploy Webhook من Coolify وأضفه في GitHub كـRepository Secret باسم `COOLIFY_DEPLOY_WEBHOOK`. عندها يستدعيه CI تلقائيًا بعد رفع الصورة الجديدة فقط.

فعّل أيضاً نسخة احتياطية خارج الخادم لقاعدة البيانات ووسائط `/data/media`؛ الـvolume تحمي من إعادة النشر لكنها ليست نسخة احتياطية ضد فقد الخادم. للرجوع لإصدار سابق غيّر `APP_IMAGE` مؤقتًا إلى `ghcr.io/habhabh/hinawi:<commit-sha>` ثم أعد النشر.
