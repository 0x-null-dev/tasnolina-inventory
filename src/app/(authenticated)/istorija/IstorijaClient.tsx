"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";

interface AuditLog {
  id: string;
  action: string;
  description: string;
  createdAt: string;
  user: { username: string };
  snapshot: unknown;
}

const actionLabels: Record<string, { label: string; color: string }> = {
  DODATO: { label: "Dodato", color: "bg-green-100 text-green-700" },
  PROMJENA_NAZIVA: {
    label: "Promena naziva",
    color: "bg-indigo-100 text-indigo-700",
  },
  PROMJENA_CIJENE: {
    label: "Promena cene",
    color: "bg-blue-100 text-blue-700",
  },
  PROMJENA_KOLICINE: {
    label: "Promena kolicine",
    color: "bg-yellow-100 text-yellow-700",
  },
  OBRISANO: { label: "Obrisano", color: "bg-red-100 text-red-700" },
  REVERT: { label: "Revert", color: "bg-purple-100 text-purple-700" },
  OTPREMNICA: {
    label: "Otpremnica",
    color: "bg-orange-100 text-orange-700",
  },
  KALKULACIJA: {
    label: "Kalkulacija",
    color: "bg-teal-100 text-teal-700",
  },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("sr-Latn-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function IstorijaClient({
  initialLogs,
}: {
  initialLogs: AuditLog[];
}) {
  const [logs] = useState<AuditLog[]>(initialLogs);
  const [confirmLog, setConfirmLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRevert = async () => {
    if (!confirmLog) return;
    setLoading(true);

    const res = await fetch("/api/audit/revert", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId: confirmLog.id }),
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Greska pri vracanju stanja");
      setLoading(false);
      setConfirmLog(null);
      return;
    }

    toast.success("Stanje magacina vraceno");
    setConfirmLog(null);
    setLoading(false);
    router.push("/magacin");
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Istorija</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Evidencija svih promena u magacinu
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          Nema zabelezenih promena
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const actionInfo = actionLabels[log.action] || {
              label: log.action,
              color: "bg-gray-100 text-gray-700",
            };

            return (
              <div
                key={log.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-xs font-medium ${actionInfo.color}`}
                      >
                        {actionInfo.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(log.createdAt)}
                      </span>
                      <span className="text-xs text-gray-400">
                        — {log.user.username}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700">{log.description}</p>
                  </div>
                  <button
                    onClick={() => setConfirmLog(log)}
                    className="shrink-0 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors whitespace-nowrap"
                  >
                    Vrati na ovo stanje
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm revert modal */}
      <Modal
        open={!!confirmLog}
        onClose={() => setConfirmLog(null)}
        title="Vrati stanje magacina"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Da li ste sigurni da zelite da vratite stanje magacina na{" "}
            <strong>{confirmLog && formatDate(confirmLog.createdAt)}</strong>?
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm text-yellow-800">
              Ova akcija ce zameniti sve trenutne proizvode, cene i kolicine sa
              stanjem iz tog trenutka.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setConfirmLog(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Otkazi
            </button>
            <button
              onClick={handleRevert}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? "Vracanje..." : "Da, vrati stanje"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
