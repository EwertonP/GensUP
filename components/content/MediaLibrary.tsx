"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/Card";
import type { Client } from "@/lib/types/client";
import type { MediaAsset } from "@/app/api/content-media/route";

const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

function extensionOf(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function fetchClients(): Promise<Client[]> {
  const res = await fetch("/api/clients");
  if (!res.ok) throw new Error("Não foi possível carregar os clientes.");
  return res.json();
}

async function fetchMedia(clientId: string): Promise<MediaAsset[]> {
  const res = await fetch(`/api/content-media?client_id=${clientId}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? "Não foi possível carregar a mídia.");
  }
  return res.json();
}

export function MediaLibrary() {
  const [clientId, setClientId] = useState<string>("");

  const clientsQuery = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  const mediaQuery = useQuery({
    queryKey: ["content-media", clientId],
    queryFn: () => fetchMedia(clientId),
    enabled: !!clientId,
  });

  const clients = clientsQuery.data ?? [];
  const assets = mediaQuery.data ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Biblioteca de mídia</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Arquivos já enviados pra cada cliente, pra reaproveitar entre peças sem re-upload.
        </p>
      </div>

      <select
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
        className="w-full max-w-xs rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">Selecione um cliente...</option>
        {clients.map((client) => (
          <option key={client.id} value={client.id}>
            {client.name}
          </option>
        ))}
      </select>

      {!clientId && <Card className="p-6 text-sm text-neutral-500">Selecione um cliente pra ver a mídia enviada.</Card>}

      {clientId && mediaQuery.isLoading && <p className="text-sm text-neutral-400">Carregando mídia...</p>}
      {clientId && mediaQuery.isError && (
        <p className="text-sm text-status-error">
          {mediaQuery.error instanceof Error ? mediaQuery.error.message : "Não foi possível carregar a mídia."}
        </p>
      )}
      {clientId && !mediaQuery.isLoading && !mediaQuery.isError && assets.length === 0 && (
        <Card className="p-6 text-sm text-neutral-500">Nenhum arquivo enviado ainda para este cliente.</Card>
      )}

      {assets.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {assets.map((asset) => {
            const isImage = IMAGE_EXTENSIONS.has(extensionOf(asset.filename));
            return (
              <Card key={asset.path} className="flex flex-col overflow-hidden">
                <div className="flex h-32 items-center justify-center bg-neutral-100">
                  {isImage && asset.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed URL externa e temporária, não é um asset otimizável pelo next/image
                    <img src={asset.signedUrl} alt={asset.filename} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-neutral-400">.{extensionOf(asset.filename)}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <p className="truncate text-xs font-medium text-neutral-700" title={asset.filename}>
                    {asset.filename}
                  </p>
                  <p className="text-xs text-neutral-400">{formatSize(asset.size)}</p>
                  {asset.signedUrl && (
                    <a
                      href={asset.signedUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary-700 hover:underline"
                    >
                      Abrir
                    </a>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
