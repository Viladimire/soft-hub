import { CategoryPage } from "@/components/templates/category-page";

import { Suspense } from "react";

export default function UtilitiesPage() {
  return (
    <Suspense fallback={null}>
      <CategoryPage category="utilities" translationKey="utilities" />
    </Suspense>
  );
}
