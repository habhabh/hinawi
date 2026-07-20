# إعداد Coolify السريع

هذه الخطوات مخصصة لربط مستودع GitHub بعد رفعه. لا تحتاج إلى تعديل أوامر البناء داخل المستودع.

## 1. PostgreSQL

1. داخل Project اختر **New Resource → PostgreSQL**.
2. استخدم PostgreSQL 17، واترك المنفذ غير مكشوف للعامة.
3. فعّل التخزين الدائم والنسخ الاحتياطي المجدول.
4. بعد التشغيل انسخ **Internal URL**؛ هذه هي قيمة `DATABASE_URL`.

## 2. تطبيق الويب

أنشئ Application من مستودع GitHub بهذه القيم:

| الحقل | القيمة |
|---|---|
| Build Pack | `Dockerfile` |
| Branch | `main` |
| Base Directory | `/` |
| Dockerfile Location | `/Dockerfile` |
| Port Exposes | `3000` |
| Health Check Path | `/api/health` |
| Domain | نطاق HTTPS النهائي |

انسخ أسماء المتغيرات من `coolify.env.example`، واستبدل القيم الوصفية. يجب أن تتطابق `APP_URL` و`BETTER_AUTH_URL` مع النطاق النهائي، دون `/` في النهاية.

أنشئ الأسرار محليًا؛ استخدم نتيجة مختلفة لكل متغير:

```bash
openssl rand -base64 48
```

عند استخدام التخزين المحلي وكان web والـworker موردين منفصلين، استخدم **Bind Mount** لهما على الخادم نفسه، مثلاً Source Path `/data/alhinnawi/media` وDestination Path `/data/media`. جهّز مسار الخادم بملكية UID/GID `1001:1001` كي يستطيع مستخدم الحاوية غير الجذري الكتابة. لا تستخدم Volume عادية لكل مورد لأن Coolify يعزل أسماء volumes حسب UUID المورد. لا تشغّل أكثر من replica واحدة، وخذ نسخة احتياطية من مسار الخادم. للإنتاج متعدد الخوادم أو replicas استخدم S3 بدلاً من المشاركة المحلية.

## 3. أول نشر وتهيئة البيانات

نفّذ أول Deploy. بعد أن يصبح التطبيق Running، افتح Terminal الخاص به ونفّذ بالترتيب:

```bash
pnpm deploy:check
pnpm db:migrate
pnpm db:seed
SUPER_ADMIN_NAME='اسم المدير' SUPER_ADMIN_EMAIL='admin@example.com' SUPER_ADMIN_PASSWORD='كلمة مرور طويلة وفريدة' pnpm create-super-admin
```

أزل متغيرات `SUPER_ADMIN_*` إن أضفتها في واجهة Coolify. لا تشغّل أمر إنشاء المدير مرة ثانية لنفس البريد.

بعد نجاح أول تهيئة ضع هذا في **Pre-deployment Command** للتحديثات اللاحقة:

```bash
pnpm db:migrate
```

ملاحظة: وفق آلية Coolify الحالية، أمر pre-deployment يعمل داخل الحاوية القائمة؛ لذلك لا نعتمد عليه وحده لإنشاء قاعدة أول نشر.

## 4. Media Worker

أنشئ Application ثانية من المستودع نفسه وبدون Domain. استخدم Dockerfile والمتغيرات نفسها ووصّل Bind Mount بنفس Source Path وDestination Path المستخدمين للويب عند التخزين المحلي. غيّر Start Command إلى:

```bash
pnpm worker:media
```

عطّل health check لهذا المورد لأنه لا يقدم خادم HTTP. اترك web application على الأمر الافتراضي الموجود في Dockerfile.

## 5. فحص التسليم

1. افتح `/api/health` وتأكد من `status: ok` و`database: ok`.
2. سجّل الدخول من `/admin/login`.
3. ارفع صورة وتأكد أن worker يحول حالتها إلى `ready`.
4. افتح `/robots.txt` و`/sitemap.xml`.
5. فعّل Auto Deploy من GitHub فقط بعد نجاح أول نشر.

إذا فشل البناء بسبب الذاكرة، خصص للبناء 2GB RAM على الأقل أو استخدم Build Server منفصلاً. لا تضع `DATABASE_URL` أو مفاتيح S3 كـDocker build arguments؛ اجعلها runtime environment variables فقط.
