# Al Hinnawi — الحناوي للديكور

مكتبة محتوى مرئية عربية لشركة ديكور وخزائن. تعرض صفحات عامة مفهرسة للبائعين والمشاريع والأقسام، مع سياق مستشار قابل للمشاركة، ولوحة إدارة محمية، ومكتبة وسائط، وروابط QR ثابتة، وتحليلات first-party تحترم الخصوصية.

## التقنية

Next.js 16 App Router وReact 19 وTypeScript strict وTailwind CSS، PostgreSQL عبر Drizzle/node-postgres، Better Auth، Sharp وFFmpeg، تخزين local أو S3-compatible، Vitest وPlaywright. الخادم مستقل عن Vercel ويُبنى بصورة Docker standalone.

## البدء محليًا

المتطلبات: Node.js 24 LTS، pnpm 11، Docker، وFFmpeg لتشغيل worker خارج Docker.

```bash
cp .env.example .env.local
docker compose -f compose.local.yml up -d postgres
pnpm install
pnpm db:migrate
MEDIA_ROOT="$PWD/data/media" pnpm db:seed
pnpm create-super-admin
pnpm dev
```

Compose يربط PostgreSQL محليًا على `127.0.0.1:55432` لتجنب التعارض مع تثبيت PostgreSQL محلي؛ الخدمات داخل Compose تستخدم المنفذ الداخلي `5432`.

ضع `SUPER_ADMIN_NAME` و`SUPER_ADMIN_EMAIL` و`SUPER_ADMIN_PASSWORD` مؤقتًا في البيئة عند تنفيذ أمر إنشاء المشرف، ثم احذفها. كلمة المرور لا تقل عن 12 حرفًا. التسجيل العام معطل.

شغّل معالج الوسائط في عملية مستقلة:

```bash
MEDIA_ROOT="$PWD/data/media" pnpm worker:media
```

## قاعدة البيانات

- `pnpm db:generate`: يولد SQL migration من تغييرات schema.
- `pnpm db:migrate`: يطبق ملفات SQL المراجعة، مستخدمًا `DATABASE_MIGRATION_URL` إن وُجد.
- `pnpm db:seed`: بيانات عربية idempotent تقريبًا ووسائط SVG محلية غير محمية.
- لا تستخدم `drizzle-kit push` في الإنتاج.
- يُفضّل مستخدم runtime محدود عبر `DATABASE_URL` ومستخدم schema منفصل عبر `DATABASE_MIGRATION_URL`.

## التخزين والوسائط

`STORAGE_DRIVER=local` يكتب إلى `MEDIA_ROOT` ويحتاج volume دائمًا. لا تستخدمه مع replicas متعددة إلا على shared filesystem. `STORAGE_DRIVER=s3` يستخدم endpoint وregion وbucket وcredentials وforce-path-style اختيارية؛ يصلح لـR2 وHetzner وB2 وGarage وأي S3-compatible. `MEDIA_PUBLIC_BASE_URL` هو دومين/مسار القراءة العام ولا تُخزن روابط مطلقة في قاعدة البيانات.

الرفع S3 مباشر عبر presigned URL؛ والرفع المحلي streaming. بعد finalize تُنشأ مهمة PostgreSQL. ينشئ worker صور WebP بمقاسات 320/640/1280/1920، ويفحص MP4/H.264 أو HEVC ويستخرج poster ومعلومات الفيديو. HLS وtranscoding الثقيل خارج النسخة الأولى.

## البريد

اضبط `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_SECURE`. إن لم تكن معدة، يستمر التطبيق ويُسجل تنبيه خادمي دون كشف وجود البريد. للاستعادة الطارئة من الخادم:

```bash
RESET_USER_EMAIL=admin@example.com RESET_USER_PASSWORD='strong-password' pnpm reset-password
```

## الاختبارات والبناء

```bash
pnpm lint
pnpm typecheck
pnpm test:unit
RUN_DB_TESTS=1 pnpm test:integration
pnpm test:e2e
pnpm build
docker build -t al-hinnawi .
```

اختبارات integration وE2E تحتاج PostgreSQL مطبق migrations ومحمّل seed. CI ينشئ قاعدة اختبار مستقلة.

## Docker وCoolify

الصورة multi-stage مبنية على Node 24 Alpine لتقليل الحجم، وتعمل كمستخدم غير root على `0.0.0.0:3000`، وتضم FFmpeg وhealthcheck. شغّل web بالأمر الافتراضي، ويشغّل Compose الـworker من الحزمة التشغيلية المسبقة البناء. التفاصيل الدقيقة في [دليل Coolify](docs/DEPLOY_COOLIFY.md).

للنشر الآلي الكامل استخدم Docker Compose Build Pack مع `docker-compose.coolify.yml`؛ سينشئ PostgreSQL والويب والـworker والـvolumes ويطبق migrations وseed وينشئ المدير تلقائياً. اتبع [قائمة Coolify السريعة](docs/COOLIFY_QUICKSTART.md). لا ترفع القيم السرية إلى GitHub.

## Render

ملف `render.yaml` ينشئ خدمة Docker وPostgreSQL وقرص الوسائط من GitHub، ويشغل migrations والـseed والمدير والـmedia worker تلقائياً. اتبع [دليل Render](docs/RENDER_DEPLOY.md). يستخدم الإعداد خدمة واحدة للويب والـworker لأن قرص Render الدائم لا يمكن مشاركته بين خدمتين.

## البنية

- `src/app`: المسارات العامة والإدارة وRoute Handlers وSEO/PWA.
- `src/components`: واجهات العميل والإدارة والوسائط.
- `src/db`: schema وqueries وmigrations.
- `src/features`: Server Actions.
- `src/lib`: auth والتخزين والتحقق والصلاحيات وSEO والهاتف.
- `src/workers`: Media Worker.
- `src/scripts`: seed وإنشاء المشرف والتنظيف والاستعادة.
- `tests`: unit وintegration وE2E.
- `docs`: المعمارية والنشر وقائمة القبول.

## النسخ الاحتياطي والاستعادة

انسخ PostgreSQL يوميًا بـ`pg_dump --format=custom` إلى وجهة مشفرة خارج الخادم، واختبر `pg_restore` دوريًا في قاعدة منفصلة. انسخ bucket عبر سياسة versioning/lifecycle أو أداة المزود. للتخزين المحلي انسخ volume `/data/media` مستقلًا. حذف تطبيق Coolify أو volume قد يحذف الوسائط إن لم توجد نسخة خارجية.

## القيود المعروفة

لا يوجد HLS/transcoding كامل، ولا CRM أو مدفوعات أو حسابات عملاء. إدارة العلاقات المتقدمة والسحب والإفلات ممثلة في schema والبنية لكن واجهة النسخة الحالية تركز على الإنشاء والقوائم والرفع؛ يمكن توسيعها دون نسخ المشاريع أو تغيير canonical.
