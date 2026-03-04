"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";
import ProductSearch from "@/components/ProductSearch";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface ItemRow {
  productId: string | null;
  productName: string;
  unit: string;
  quantity: string;
  price: string;
}

interface DeliveryData {
  id?: string;
  number: string;
  dateIssued: string;
  supplier: string;
  buyer: string;
  issuedBy: string;
  receivedBy: string;
  affectsStock: boolean;
  items: {
    productId: string | null;
    productName: string;
    unit: string;
    quantity: number;
    price: number;
  }[];
}

function emptyRow(): ItemRow {
  return { productId: null, productName: "", unit: "kom", quantity: "", price: "" };
}

function createInitialRows(count: number): ItemRow[] {
  return Array.from({ length: count }, () => emptyRow());
}

function formatRSD(value: number) {
  return value.toLocaleString("sr-Latn-RS");
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

export default function OtpremnicaFormClient({
  products,
  existing,
}: {
  products: Product[];
  existing?: DeliveryData;
}) {
  const router = useRouter();
  const isEdit = !!existing;

  const [number, setNumber] = useState(existing?.number || "");
  const [dateIssued, setDateIssued] = useState(
    existing?.dateIssued ? existing.dateIssued.split("T")[0] : todayISO()
  );
  const [supplier, setSupplier] = useState(
    existing?.supplier ||
      "Danijela Opacic PR Tasnerska Radnja Beograd (Vracar)"
  );
  const buyer = "Radnja u Bulevaru kralja Aleksandra 86/90 Beograd";
  const [issuedBy, setIssuedBy] = useState(existing?.issuedBy || "");
  const [receivedBy, setReceivedBy] = useState(existing?.receivedBy || "");
  const [affectsStock, setAffectsStock] = useState(
    existing?.affectsStock || false
  );

  const initialItems: ItemRow[] = existing?.items
    ? existing.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        quantity: String(item.quantity),
        price: String(item.price),
      }))
    : [];

  // Ensure at least 5 rows
  while (initialItems.length < 5) {
    initialItems.push(emptyRow());
  }

  const [items, setItems] = useState<ItemRow[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const updateItem = (index: number, updates: Partial<ItemRow>) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const addRows = () => {
    setItems((prev) => [...prev, ...createInitialRows(5)]);
  };

  const getRowTotal = (row: ItemRow) => {
    const qty = parseFloat(row.quantity) || 0;
    const price = parseFloat(row.price) || 0;
    return qty * price;
  };

  const grandTotal = items.reduce((sum, row) => sum + getRowTotal(row), 0);

  const handleSave = async () => {
    setError("");

    if (!number.trim()) {
      setError("Broj otpremnice je obavezan");
      return;
    }
    if (!supplier.trim()) {
      setError("Dobavljac je obavezan");
      return;
    }

    const validItems = items
      .filter((item) => item.productName.trim() && parseFloat(item.quantity) > 0)
      .map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        quantity: parseInt(item.quantity, 10) || 0,
        price: parseFloat(item.price) || 0,
      }));

    setLoading(true);

    const url = isEdit
      ? `/api/deliveries/${existing!.id}`
      : "/api/deliveries";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: number.trim(),
        dateIssued,
        supplier: supplier.trim(),
        buyer,
        issuedBy: issuedBy.trim() || null,
        receivedBy: receivedBy.trim() || null,
        affectsStock,
        items: validItems,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Greska pri cuvanju");
      setLoading(false);
      return;
    }

    toast.success(
      isEdit
        ? `Otpremnica br. ${number} azurirana`
        : `Otpremnica br. ${number} sacuvana`
    );
    window.location.href = "/otpremnice";
  };

  return (
    <div>
      {/* Screen header */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? `Otpremnica br. ${existing!.number}` : "Nova otpremnica"}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Stampaj
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {loading ? "Cuvanje..." : "Sacuvaj"}
          </button>
        </div>
      </div>

      {/* Print header */}
      <div className="print-only mb-6">
        <div className="flex items-center justify-between border-b-2 border-red-600 pb-3">
          <Image src="/logo.webp" alt="Tasnolina" width={120} height={60} />
          <div className="text-right text-sm text-gray-600">
            <p>
              Datum stampe:{" "}
              {new Date().toLocaleDateString("sr-Latn-RS", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Header fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dobavljac
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
            />
            <span className="print-only text-sm">{supplier}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kupac
            </label>
            <input
              type="text"
              value={buyer}
              readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600 no-print-input"
            />
            <span className="print-only text-sm">{buyer}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Otpremnica br.
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Unesite broj otpremnice"
            />
            <span className="print-only text-sm font-bold">{number}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datum izdavanja
            </label>
            <input
              type="date"
              value={dateIssued}
              onChange={(e) => setDateIssued(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
            />
            <span className="print-only text-sm">
              {new Date(dateIssued + "T00:00:00").toLocaleDateString("sr-Latn-RS", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Affects stock toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 no-print">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={affectsStock}
            onChange={(e) => setAffectsStock(e.target.checked)}
            className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900">
              Da li ova otpremnica utice na magacin?
            </p>
            <p className="text-xs text-gray-500">
              Ako je ukljuceno, kolicine i cene proizvoda ce biti azurirane
            </p>
          </div>
        </label>
      </div>

      {error && (
        <div className="mb-4 no-print">
          <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </p>
        </div>
      )}

      {/* Items table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-center px-2 py-3 font-semibold text-gray-700 w-12">
                  Rb.
                </th>
                <th className="text-left px-2 py-3 font-semibold text-gray-700 min-w-[200px]">
                  Naziv robe
                </th>
                <th className="text-center px-2 py-3 font-semibold text-gray-700 w-20">
                  Jed. mere
                </th>
                <th className="text-right px-2 py-3 font-semibold text-gray-700 w-24">
                  Kolicina
                </th>
                <th className="text-right px-2 py-3 font-semibold text-gray-700 w-28">
                  Cena
                </th>
                <th className="text-right px-2 py-3 font-semibold text-gray-700 w-32">
                  Iznos
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const rowTotal = getRowTotal(item);
                const isEmpty = !item.productName.trim();
                return (
                  <tr key={i} className={`border-b border-gray-100${isEmpty ? " print-empty-row" : ""}`}>
                    <td className="px-2 py-1.5 text-center text-gray-500 text-xs">
                      {i + 1}
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="no-print">
                        <ProductSearch
                          products={products}
                          value={item.productName}
                          selectedProductId={item.productId}
                          onChange={(name, productId, price) => {
                            const updates: Partial<ItemRow> = {
                              productName: name,
                              productId: productId,
                            };
                            if (price !== null) {
                              updates.price = String(price);
                            }
                            updateItem(i, updates);
                          }}
                        />
                      </div>
                      <span className="print-only text-sm">
                        {item.productName}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          updateItem(i, { unit: e.target.value })
                        }
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-sm text-center block">
                        {item.unit}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(i, { quantity: e.target.value })
                        }
                        min="0"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-sm text-right block">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(i, { price: e.target.value })
                        }
                        min="0"
                        step="0.01"
                        className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-sm text-right block">
                        {item.price}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right text-gray-900 font-medium whitespace-nowrap">
                      {rowTotal > 0 ? formatRSD(rowTotal) : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={5} className="px-4 py-3 text-right font-bold text-gray-900">
                  Ukupno:
                </td>
                <td className="px-2 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                  {formatRSD(grandTotal)} RSD
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Add rows button */}
      <div className="mb-4 no-print">
        <button
          onClick={addRows}
          className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Dodaj redove
        </button>
      </div>

      {/* Signature fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Robu izdao
            </label>
            <input
              type="text"
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Potpis"
            />
            <div className="print-only mt-8 border-t border-gray-400 pt-1 text-sm">
              {issuedBy || "___________________"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Robu primio
            </label>
            <input
              type="text"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Potpis"
            />
            <div className="print-only mt-8 border-t border-gray-400 pt-1 text-sm">
              {receivedBy || "___________________"}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom save button (mobile convenience) */}
      <div className="mt-4 flex gap-2 no-print">
        <button
          onClick={() => router.push("/otpremnice")}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Nazad
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Cuvanje..." : "Sacuvaj"}
        </button>
      </div>
    </div>
  );
}
