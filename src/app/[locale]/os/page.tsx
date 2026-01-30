import { CategoryPage } from "@/components/templates/category-page";

import { Suspense } from "react";

export default function OperatingSystemsPage() {
  return (
    <Suspense fallback={null}>
      <CategoryPage category="operating-systems" translationKey="operatingSystems" />
    </Suspense>
  );
}
