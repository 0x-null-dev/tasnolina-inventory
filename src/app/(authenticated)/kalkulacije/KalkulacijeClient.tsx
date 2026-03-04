"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";

interface Calculation {
  id: string;
  number: string;
  deliveryNumber: string | null;
  dateIssued: string;
  affectsStock: boolean;
  totalSellingPriceVat: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("sr-Latn-RS", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatRSD(value: number) {
  return value.toLocaleString("sr-Latn-RS");
}

export default function KalkulacijeClient({
  initialCalculations,
}: {
  initialCalculations: Calculation[];
}) {
  const [calculations, setCalculations] =
    useState<Calculation[]>(initialCalculations);
  const [deleteTarget, setDeleteTarget] = useState<Calculation | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);

    const res = await fetch(`/api/calculations/${deleteTarget.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Greska pri brisanju");
      setDeleteLoading(false);
      setDeleteTarget(null);
      return;
    }

    setCalculations((prev) => prev.filter((c) => c.id !== deleteTarget.id));
    toast.success(`Kalkulacija br. ${deleteTarget.number} obrisana`);
    setDeleteTarget(null);
    setDeleteLoading(false);
    router.refresh();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalkulacije</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {calculations.length}{" "}
            {calculations.length === 1 ? "kalkulacija" : "kalkulacija"}
          </p>
        </div>
        <Link
          href="/kalkulacije/nova"
          className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
        >
          Nova kalkulacija
        </Link>
      </div>

      {calculations.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          Nema kalkulacija
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">
                    Broj
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">
                    Datum
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-700">
                    Otpremnica br.
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-700">
                    Ukupno sa PDV
                  </th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-700">
                    Magacin
                  </th>
                  <th className="px-4 py-3 w-[1%]"></th>
                </tr>
              </thead>
              <tbody>
                {calculations.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {c.number}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatDate(c.dateIssued)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c.deliveryNumber || "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium whitespace-nowrap">
                      {formatRSD(c.totalSellingPriceVat)} RSD
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.affectsStock ? (
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-700">
                          Da
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-500">
                          Ne
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => router.push(`/kalkulacije/${c.id}`)}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors whitespace-nowrap"
                        >
                          Otvori
                        </button>
                        <button
                          onClick={() => setDeleteTarget(c)}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
                        >
                          Obrisi
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Obrisi kalkulaciju"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Da li ste sigurni da zelite da obrisete kalkulaciju br.{" "}
            <strong>{deleteTarget?.number}</strong>?
          </p>
          {deleteTarget?.affectsStock && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                Ova kalkulacija je uticala na magacin. Brisanjem ce se vratiti
                kolicine proizvoda.
              </p>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Otkazi
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleteLoading ? "Brisanje..." : "Da, obrisi"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
