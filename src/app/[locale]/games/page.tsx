import { CategoryPage } from "@/components/templates/category-page";

import { Suspense } from "react";

export default function GamesPage() {
  return (
    <Suspense fallback={null}>
      <CategoryPage category="games" translationKey="games" />
    </Suspense>
  );
}
