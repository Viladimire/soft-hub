import { CategoryPage } from "@/components/templates/category-page";

import { Suspense } from "react";

export default function MultimediaPage() {
  return (
    <Suspense fallback={null}>
      <CategoryPage category="multimedia" translationKey="multimedia" />
    </Suspense>
  );
}
