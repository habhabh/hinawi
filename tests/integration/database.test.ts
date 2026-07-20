import { afterAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, pool } from "@/db";
import { projects, sellers, sellerProjects } from "@/db/schema";

const run = process.env.RUN_DB_TESTS === "1" ? describe : describe.skip;
run("تكامل قاعدة البيانات", () => {
  afterAll(() => pool.end());
  it("يُسند المشروع المركزي نفسه إلى عدة بائعين بلا نسخ", async () => {
    await db.transaction(async (tx) => {
      const [project] = await tx.insert(projects).values({ slug: `test-${crypto.randomUUID()}`, title: "مشروع مركزي" }).returning();
      const insertedSellers = await tx.insert(sellers).values([{ slug: `a-${crypto.randomUUID()}`, name: "أحمد" }, { slug: `b-${crypto.randomUUID()}`, name: "خالد" }]).returning();
      await tx.insert(sellerProjects).values(insertedSellers.map((seller) => ({ sellerId: seller.id, projectId: project.id })));
      const assignments = await tx.select().from(sellerProjects).where(eq(sellerProjects.projectId, project.id));
      expect(assignments).toHaveLength(2);
      tx.rollback();
    }).catch((error) => { if (!(error instanceof Error && error.message.includes("Rollback"))) throw error; });
  });
});
