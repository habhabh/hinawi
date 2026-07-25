import Link from "next/link";
import { MediaUploader } from "@/components/admin/media-uploader";
import {
  archiveCategoryAction,
  archiveProjectAction,
  archiveSellerAction,
  updateCategoryAction,
  updateProjectAction,
  updateSellerAction,
} from "@/features/admin/actions";

type Choice = { id: string; name: string };
type ProjectChoice = { id: string; title: string; status?: string };

function TextField({ label, name, value, type = "text", required = false, wide = false }: { label: string; name: string; value?: string | number | null; type?: string; required?: boolean; wide?: boolean }) {
  return <div className={`field ${wide ? "field-wide" : ""}`}><label htmlFor={name}>{label}</label><input id={name} name={name} type={type} required={required} defaultValue={value ?? ""} /></div>;
}

function TextArea({ label, name, value, rows = 4 }: { label: string; name: string; value?: string | null; rows?: number }) {
  return <div className="field field-wide"><label htmlFor={name}>{label}</label><textarea id={name} name={name} rows={rows} defaultValue={value ?? ""} /></div>;
}

function ChoiceGrid({ title, description, name, choices, selected }: { title: string; description?: string; name: string; choices: Choice[]; selected: Set<string> }) {
  return <fieldset className="field-wide relation-field"><legend>{title}</legend>{description && <p className="muted">{description}</p>}<div className="choice-grid">{choices.map((choice) => <label className="choice" key={choice.id}><input type="checkbox" name={name} value={choice.id} defaultChecked={selected.has(choice.id)} /><span>{choice.name}</span></label>)}</div>{!choices.length && <p className="empty-note">لا توجد خيارات متاحة بعد.</p>}</fieldset>;
}

export function SellerEditForm({ data }: { data: {
  seller: { id: string; name: string; slug: string; jobTitle: string | null; bio: string | null; phoneE164: string | null; whatsappE164: string | null; email: string | null; showEmail: boolean; branch: string | null; avatarAssetId: string | null; customWhatsappMessage: string | null; isActive: boolean; seoTitle: string | null; seoDescription: string | null };
  categories: Choice[];
  projects: ProjectChoice[];
  avatars: Choice[];
  categoryIds: string[];
  projectIds: string[];
} }) {
  const { seller } = data;
  return <>
    <MediaUploader sellerId={seller.id} />
    <form className="card form-grid editor-form" action={updateSellerAction}>
      <input type="hidden" name="id" value={seller.id} />
      <TextField label="الاسم" name="name" value={seller.name} required />
      <TextField label="الرابط المختصر" name="slug" value={seller.slug} required />
      <TextField label="المسمى الوظيفي" name="jobTitle" value={seller.jobTitle} />
      <TextField label="الفرع" name="branch" value={seller.branch} />
      <TextField label="رقم الاتصال E.164" name="phoneE164" value={seller.phoneE164} />
      <TextField label="واتساب E.164" name="whatsappE164" value={seller.whatsappE164} />
      <TextField label="البريد الإلكتروني" name="email" type="email" value={seller.email} />
      <div className="field"><label htmlFor="avatarAssetId">الصورة الشخصية من المكتبة</label><select id="avatarAssetId" name="avatarAssetId" defaultValue={seller.avatarAssetId ?? ""}><option value="">بدون صورة</option>{data.avatars.map((asset) => <option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></div>
      <TextArea label="نبذة البائع" name="bio" value={seller.bio} />
      <TextArea label="رسالة واتساب المخصصة" name="customWhatsappMessage" value={seller.customWhatsappMessage} />
      <TextField label="عنوان SEO" name="seoTitle" value={seller.seoTitle} wide />
      <TextArea label="وصف SEO" name="seoDescription" value={seller.seoDescription} rows={3} />
      <ChoiceGrid title="الأقسام الظاهرة في صفحة البائع" description="لا يظهر القسم في الواجهة إلا إذا كان له مشروع منشور مسند إلى البائع." name="categoryIds" choices={data.categories} selected={new Set(data.categoryIds)} />
      <ChoiceGrid title="المشاريع المسندة إلى البائع" description="المشروع كيان مركزي؛ إسناده هنا لا ينشئ نسخة جديدة." name="projectIds" choices={data.projects.map((project) => ({ id: project.id, name: `${project.title} · ${project.status}` }))} selected={new Set(data.projectIds)} />
      <div className="field-wide inline-options"><label><input type="checkbox" name="isActive" defaultChecked={seller.isActive} /> البائع نشط ويظهر للعامة</label><label><input type="checkbox" name="showEmail" defaultChecked={seller.showEmail} /> إظهار البريد</label></div>
      <div className="field-wide form-actions"><button className="button button-primary">حفظ جميع التعديلات</button><Link className="button" href={`/s/${seller.slug}`} target="_blank">معاينة الصفحة</Link></div>
    </form>
    <form className="danger-zone" action={archiveSellerAction}><input type="hidden" name="id" value={seller.id} /><div><strong>حذف البائع</strong><p className="muted">سيختفي من الواجهة وتبقى سجلاته محفوظة للمراجعة.</p></div><button className="button button-danger">حذف البائع</button></form>
  </>;
}

export function CategoryEditForm({ data }: { data: {
  category: { id: string; name: string; slug: string; description: string | null; isActive: boolean; seoTitle: string | null; seoDescription: string | null };
  linkedProjects: ProjectChoice[];
  linkedSellers: Choice[];
} }) {
  const { category } = data;
  return <>
    <form className="card form-grid editor-form" action={updateCategoryAction}>
      <input type="hidden" name="id" value={category.id} />
      <TextField label="اسم القسم" name="name" value={category.name} required />
      <TextField label="الرابط المختصر" name="slug" value={category.slug} required />
      <TextArea label="الوصف" name="description" value={category.description} />
      <TextField label="عنوان SEO" name="seoTitle" value={category.seoTitle} wide />
      <TextArea label="وصف SEO" name="seoDescription" value={category.seoDescription} rows={3} />
      <div className="field-wide inline-options"><label><input type="checkbox" name="isActive" defaultChecked={category.isActive} /> القسم نشط ويظهر للعامة</label></div>
      <div className="field-wide form-actions"><button className="button button-primary">حفظ القسم</button><Link className="button" href={`/categories/${category.slug}`} target="_blank">معاينة القسم</Link></div>
    </form>
    <section className="card linked-summary"><h2>الترابط الحالي</h2><p><strong>المشاريع:</strong> {data.linkedProjects.length ? data.linkedProjects.map((item) => item.title).join("، ") : "لا يوجد"}</p><p><strong>البائعون:</strong> {data.linkedSellers.length ? data.linkedSellers.map((item) => item.name).join("، ") : "لا يوجد"}</p><p className="muted">يمكن تغيير هذه العلاقات من محرر المشروع أو البائع.</p></section>
    <form className="danger-zone" action={archiveCategoryAction}><input type="hidden" name="id" value={category.id} /><div><strong>حذف القسم</strong><p className="muted">سيختفي القسم من الواجهة دون حذف المشاريع.</p></div><button className="button button-danger">حذف القسم</button></form>
  </>;
}

export function ProjectEditForm({ data }: { data: {
  project: { id: string; title: string; slug: string; summary: string | null; description: string | null; status: "draft" | "published" | "archived"; location: string | null; projectYear: number | null; designStyle: string | null; materials: string[]; featured: boolean; seoTitle: string | null; seoDescription: string | null };
  categories: Choice[];
  sellers: Choice[];
  assets: { id: string; name: string; type: "image" | "video" }[];
  items: { id: string; assetId: string; itemType: "image" | "video" | "before_after"; isCover: boolean }[];
  categoryIds: string[];
  sellerIds: string[];
} }) {
  const { project } = data;
  const selectedAssets = new Set(data.items.map((item) => item.assetId));
  const cover = data.items.find((item) => item.isCover)?.assetId;
  const protectedItems = data.items.filter((item) => item.itemType === "before_after");
  return <>
    <MediaUploader projectId={project.id} />
    <form className="card form-grid editor-form" action={updateProjectAction}>
      <input type="hidden" name="id" value={project.id} />
      <TextField label="عنوان المشروع" name="title" value={project.title} required />
      <TextField label="الرابط المختصر" name="slug" value={project.slug} required />
      <TextField label="الموقع" name="location" value={project.location} />
      <TextField label="سنة المشروع" name="projectYear" type="number" value={project.projectYear} />
      <TextField label="النمط التصميمي" name="designStyle" value={project.designStyle} />
      <div className="field"><label htmlFor="status">حالة النشر</label><select id="status" name="status" defaultValue={project.status}><option value="draft">مسودة</option><option value="published">منشور</option><option value="archived">مؤرشف</option></select></div>
      <TextArea label="الملخص" name="summary" value={project.summary} />
      <TextArea label="الوصف الكامل" name="description" value={project.description} rows={6} />
      <TextArea label="الخامات (افصل بينها بفاصلة أو سطر)" name="materials" value={project.materials.join("، ")} rows={3} />
      <TextField label="عنوان SEO" name="seoTitle" value={project.seoTitle} wide />
      <TextArea label="وصف SEO" name="seoDescription" value={project.seoDescription} rows={3} />
      <ChoiceGrid title="أقسام المشروع" description="أول قسم محدد يصبح القسم الأساسي للمشروع." name="categoryIds" choices={data.categories} selected={new Set(data.categoryIds)} />
      <ChoiceGrid title="البائعون المرتبطون بالمشروع" description="يمكن إسناد المشروع المركزي نفسه لأكثر من بائع دون نسخه." name="sellerIds" choices={data.sellers} selected={new Set(data.sellerIds)} />
      <fieldset className="field-wide relation-field"><legend>صور وفيديوهات المشروع</legend><p className="muted">الوسائط المرفوعة أعلاه تُضاف تلقائيًا. ألغِ تحديد أي وسيط لإزالته من المشروع، واختر الغلاف.</p><div className="media-choice-grid">{data.assets.map((asset) => <div className="media-choice" key={asset.id}><label><input type="checkbox" name="mediaAssetIds" value={asset.id} defaultChecked={selectedAssets.has(asset.id)} /> <span>{asset.name}</span> <small>{asset.type === "image" ? "صورة" : "فيديو"}</small></label><label className="cover-choice"><input type="radio" name="coverAssetId" value={asset.id} defaultChecked={cover === asset.id} /> غلاف</label></div>)}</div>{!data.assets.length && <p className="empty-note">لا توجد وسائط جاهزة بعد.</p>}{protectedItems.length > 0 && <p className="muted">عناصر قبل/بعد الحالية محفوظة ولا تُحذف من هذا النموذج.</p>}</fieldset>
      <div className="field-wide inline-options"><label><input type="checkbox" name="featured" defaultChecked={project.featured} /> مشروع مميز</label></div>
      <div className="field-wide form-actions"><button className="button button-primary">حفظ وربط المشروع</button><Link className="button" href={`/works/${project.slug}`} target="_blank">معاينة المشروع</Link></div>
    </form>
    <form className="danger-zone" action={archiveProjectAction}><input type="hidden" name="id" value={project.id} /><div><strong>حذف المشروع</strong><p className="muted">سيختفي من جميع صفحات البائعين والأقسام دون حذف ملفات الوسائط.</p></div><button className="button button-danger">حذف المشروع</button></form>
  </>;
}
