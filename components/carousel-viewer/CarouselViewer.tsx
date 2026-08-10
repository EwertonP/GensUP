"use client";

import { useState } from "react";

interface CarouselViewerProps {
  images: string[];
  ctaPageIndex?: number;
}

export function CarouselViewer({ images, ctaPageIndex }: CarouselViewerProps) {
  const [page, setPage] = useState(0);

  return (
    <div className="flex flex-col items-center gap-3">
      <img src={images[page]} alt={`Página ${page + 1}`} className="max-h-[480px] rounded-lg border border-neutral-200" />
      <div className="flex items-center gap-3 text-sm text-neutral-500">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
          ‹ Anterior
        </button>
        <span>
          Página {page + 1} de {images.length}
          {page === ctaPageIndex && " · CTA"}
        </span>
        <button onClick={() => setPage((p) => Math.min(images.length - 1, p + 1))} disabled={page === images.length - 1}>
          Próxima ›
        </button>
      </div>
      {/* PageComments entra aqui na Fase 1 */}
    </div>
  );
}
