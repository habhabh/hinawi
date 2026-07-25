import { Building2, Mail, MessageCircle, Phone } from "lucide-react";
import Image from "next/image";
import { AnalyticsLink } from "@/components/public/analytics-link";
import { ShareButton } from "@/components/public/share-button";
import { buildWhatsappUrl, interpolateWhatsappMessage } from "@/lib/whatsapp";

type Seller = { name: string; jobTitle: string | null; bio: string | null; branch: string | null; avatarUrl: string | null; phoneE164: string | null; whatsappE164: string | null; email: string | null; showEmail: boolean; customWhatsappMessage: string | null };

export function SellerProfile({ seller, companyName }: { seller: Seller; companyName: string }) {
  const initials = seller.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
  const template = seller.customWhatsappMessage || "مرحبًا أستاذ/ة {seller_name}، شاهدت أعمالكم في موقع {company_name} وأرغب في معرفة المزيد.";
  const whatsapp = seller.whatsappE164 ? buildWhatsappUrl(seller.whatsappE164, interpolateWhatsappMessage(template, { sellerName: seller.name, companyName })) : null;
  return <section className="profile" aria-labelledby="seller-name">
    {seller.avatarUrl ? <Image className="avatar" src={seller.avatarUrl} width={116} height={116} unoptimized alt={`صورة ${seller.name}`} /> : <div className="avatar avatar-fallback" aria-label={`صورة بديلة لـ ${seller.name}`}>{initials}</div>}
    <span className="eyebrow">{seller.jobTitle || "مستشار تصميم"}</span>
    <h1 id="seller-name">{seller.name}</h1>
    {seller.branch && <span className="muted"><Building2 size={14} style={{ display: "inline", marginInlineEnd: ".3rem" }} />{seller.branch}</span>}
    {seller.bio && <p className="bio">{seller.bio}</p>}
    <div className="actions">
      {whatsapp && <AnalyticsLink href={whatsapp} eventType="whatsapp_click" className="button button-primary"><MessageCircle size={19} />واتساب</AnalyticsLink>}
      {seller.phoneE164 && <AnalyticsLink href={`tel:${seller.phoneE164}`} eventType="phone_click" className="button" ><Phone size={19} /><span className="sr-only">اتصال</span></AnalyticsLink>}
      {seller.showEmail && seller.email && <a href={`mailto:${seller.email}`} className="button"><Mail size={19} /><span className="sr-only">البريد الإلكتروني</span></a>}
      <ShareButton title={`صفحة ${seller.name}`} className="button" />
    </div>
  </section>;
}
