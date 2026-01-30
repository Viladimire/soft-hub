import { CategoryPage } from "@/components/templates/category-page";

import { Suspense } from "react";

export default function SoftwareIndexPage() {
  return (
    <Suspense fallback={null}>
      <CategoryPage category={"software"} translationKey="software" />
    </Suspense>
  );
}
