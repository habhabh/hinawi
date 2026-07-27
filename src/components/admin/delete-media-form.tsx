"use client";

import { useFormStatus } from "react-dom";
import { deleteMediaAction } from "@/features/admin/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button className="button button-danger" type="submit" disabled={pending}>
      {pending ? "جارٍ الحذف…" : "حذف نهائي"}
    </button>
  );
}

export function DeleteMediaForm({ id, name }: { id: string; name: string }) {
  return (
    <form
      action={deleteMediaAction}
      onSubmit={(event) => {
        if (!window.confirm(`سيُحذف «${name}» من المشاريع ومن R2 نهائيًا. هل تريد المتابعة؟`)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <SubmitButton />
    </form>
  );
}
