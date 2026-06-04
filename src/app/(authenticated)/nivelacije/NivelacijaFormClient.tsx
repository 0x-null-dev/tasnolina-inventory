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
  amount: number;
}

interface ItemRow {
  productId: string | null;
  articleCode: string;
  productName: string;
  unit: string;
  quantity: string;
  oldPrice: string;
  newPrice: string;
  note: string;
}

interface NivelacijaData {
  id?: string;
  number: string;
  dateIssued: string;
  affectsStock: boolean;
  workplace: string;
  department: string;
  taxpayerCode: string;
  activityCode: string;
  signedBy: string;
  items: {
    productId: string | null;
    articleCode: string | null;
    productName: string;
    unit: string;
    quantity: number;
    oldPrice: number;
    newPrice: number;
    note: string | null;
  }[];
}

function emptyRow(): ItemRow {
  return {
    productId: null,
    articleCode: "",
    productName: "",
    unit: "kom",
    quantity: "",
    oldPrice: "",
    newPrice: "",
    note: "",
  };
}

function createInitialRows(count: number): ItemRow[] {
  return Array.from({ length: count }, () => emptyRow());
}

function formatRSD(value: number) {
  return value.toLocaleString("sr-Latn-RS", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

const VAT_RATE = 0.2;

export default function NivelacijaFormClient({
  products,
  existing,
}: {
  products: Product[];
  existing?: NivelacijaData;
}) {
  const router = useRouter();
  const isEdit = !!existing;

  const [number, setNumber] = useState(existing?.number || "");
  const [dateIssued, setDateIssued] = useState(
    existing?.dateIssued ? existing.dateIssued.split("T")[0] : todayISO()
  );
  const [workplace, setWorkplace] = useState(existing?.workplace || "");
  const [department, setDepartment] = useState(existing?.department || "");
  const [taxpayerCode, setTaxpayerCode] = useState(
    existing?.taxpayerCode || ""
  );
  const [activityCode, setActivityCode] = useState(
    existing?.activityCode || ""
  );
  const [signedBy, setSignedBy] = useState(existing?.signedBy || "");
  const [affectsStock, setAffectsStockState] = useState(
    existing ? existing.affectsStock : true
  );

  const productById = (id: string | null) =>
    id ? products.find((p) => p.id === id) : undefined;

  // When toggle flips ON, force-sync quantity AND oldPrice to magacin values for every linked row.
  const setAffectsStock = (next: boolean) => {
    setAffectsStockState(next);
    if (next) {
      setItems((prev) =>
        prev.map((row) => {
          const p = productById(row.productId);
          return p
            ? {
                ...row,
                quantity: String(p.amount),
                oldPrice: String(p.price),
              }
            : row;
        })
      );
    }
  };

  const initialItems: ItemRow[] = existing?.items
    ? existing.items.map((item) => ({
        productId: item.productId,
        articleCode: item.articleCode || "",
        productName: item.productName,
        unit: item.unit,
        quantity: String(item.quantity),
        oldPrice: String(item.oldPrice),
        newPrice: String(item.newPrice),
        note: item.note || "",
      }))
    : [];

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

  // Calculated columns for a row
  const calcRow = (row: ItemRow) => {
    const qty = parseFloat(row.quantity) || 0;
    const oldP = parseFloat(row.oldPrice) || 0;
    const newP = parseFloat(row.newPrice) || 0;
    const oldValue = qty * oldP; // col 7
    const newValue = qty * newP; // col 9
    const diff = newValue - oldValue;
    const diffPlus = diff > 0 ? diff : 0; // col 10
    const diffMinus = diff < 0 ? -diff : 0; // col 11
    // VAT amounts (the cells show VAT included in the prices, computed as price * rate / (1 + rate))
    const oldVat = (oldValue * VAT_RATE) / (1 + VAT_RATE); // col 12
    const newVat = (newValue * VAT_RATE) / (1 + VAT_RATE); // col 13
    return { oldValue, newValue, diffPlus, diffMinus, oldVat, newVat };
  };

  // Footer totals
  const totals = items.reduce(
    (acc, row) => {
      const c = calcRow(row);
      return {
        oldValue: acc.oldValue + c.oldValue,
        newValue: acc.newValue + c.newValue,
        diffPlus: acc.diffPlus + c.diffPlus,
        diffMinus: acc.diffMinus + c.diffMinus,
        oldVat: acc.oldVat + c.oldVat,
        newVat: acc.newVat + c.newVat,
      };
    },
    {
      oldValue: 0,
      newValue: 0,
      diffPlus: 0,
      diffMinus: 0,
      oldVat: 0,
      newVat: 0,
    }
  );

  const handleSave = async () => {
    setError("");

    if (!number.trim()) {
      setError("Broj nivelacije je obavezan");
      return;
    }

    const validItems = items
      .filter(
        (item) => item.productName.trim() && parseFloat(item.quantity) > 0
      )
      .map((item) => ({
        productId: item.productId,
        articleCode: item.articleCode.trim() || null,
        productName: item.productName,
        unit: item.unit,
        quantity: parseInt(item.quantity, 10) || 0,
        oldPrice: parseFloat(item.oldPrice) || 0,
        newPrice: parseFloat(item.newPrice) || 0,
        note: item.note.trim() || null,
      }));

    setLoading(true);

    const url = isEdit
      ? `/api/nivelacije/${existing!.id}`
      : "/api/nivelacije";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: number.trim(),
        dateIssued,
        affectsStock,
        workplace: workplace.trim() || null,
        department: department.trim() || null,
        taxpayerCode: taxpayerCode.trim() || null,
        activityCode: activityCode.trim() || null,
        signedBy: signedBy.trim() || null,
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
        ? `Nivelacija br. ${number} azurirana`
        : `Nivelacija br. ${number} sacuvana`
    );
    window.location.href = "/nivelacije";
  };

  return (
    <div>
      {/* Screen header */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? `Nivelacija br. ${existing!.number}` : "Nova nivelacija"}
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
      <div className="print-only mb-4">
        <div className="flex items-center justify-between border-b-2 border-red-600 pb-3">
          <Image src="/logo.webp" alt="Tasnolina" width={120} height={60} />
          <div className="text-right text-xs text-gray-600">
            <p>PIB: 100292681</p>
            <p>Opacic Danijela</p>
            <p>PR Tasnerska radnja Beograd</p>
            <p>Sediste: Beograd</p>
          </div>
        </div>
        <div className="mt-3 text-center">
          <h2 className="text-lg font-bold">POPIS ROBE</h2>
          <p className="text-sm text-gray-700">Svrha popisa: Nivelacija</p>
          <p className="text-sm text-gray-600 mt-1">
            List br. {number} | Na dan:{" "}
            {new Date(dateIssued + "T00:00:00").toLocaleDateString(
              "sr-Latn-RS",
              {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              }
            )}
          </p>
        </div>
      </div>

      {/* Header fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              List br. (Broj nivelacije)
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Unesite broj nivelacije"
            />
            <span className="print-only text-sm font-bold">{number}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Na dan
            </label>
            <input
              type="date"
              value={dateIssued}
              onChange={(e) => setDateIssued(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
            />
            <span className="print-only text-sm">
              {new Date(dateIssued + "T00:00:00").toLocaleDateString(
                "sr-Latn-RS",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }
              )}
            </span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Radno mesto
            </label>
            <input
              type="text"
              value={workplace}
              onChange={(e) => setWorkplace(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Radno mesto"
            />
            <span className="print-only text-sm">{workplace}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Odeljenje
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Odeljenje"
            />
            <span className="print-only text-sm">{department}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sifra poreskog obveznika
            </label>
            <input
              type="text"
              value={taxpayerCode}
              onChange={(e) => setTaxpayerCode(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Sifra poreskog obveznika"
            />
            <span className="print-only text-sm">{taxpayerCode}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sifra delatnosti
            </label>
            <input
              type="text"
              value={activityCode}
              onChange={(e) => setActivityCode(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Sifra delatnosti"
            />
            <span className="print-only text-sm">{activityCode}</span>
          </div>
        </div>

        {/* Fixed metadata */}
        <div className="mt-4 pt-4 border-t border-gray-100 no-print">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm text-gray-500">
            <div>
              <span className="font-medium text-gray-700">PIB:</span> 100292681
            </div>
            <div>
              <span className="font-medium text-gray-700">Obveznik:</span>{" "}
              Opacic Danijela
            </div>
            <div>
              <span className="font-medium text-gray-700">Firma:</span> PR
              Tasnerska radnja Beograd
            </div>
            <div>
              <span className="font-medium text-gray-700">Sediste:</span>{" "}
              Beograd
            </div>
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
              Da li ova nivelacija utice na magacin?
            </p>
            <p className="text-xs text-gray-500">
              Ako je ukljuceno, nove cene proizvoda u magacinu ce biti azurirane
              (samo proizvodi povezani sa magacinom)
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
              {/* Group header for Razlika (cols 10-11) and PDV (cols 12-13) */}
              <tr className="border-b border-gray-100 bg-gray-50">
                <th colSpan={9}></th>
                <th
                  colSpan={2}
                  className="text-center px-1 py-1 font-semibold text-gray-600 text-xs border-l border-gray-200"
                >
                  Razlika
                </th>
                <th
                  colSpan={2}
                  className="text-center px-1 py-1 font-semibold text-gray-600 text-xs border-l border-gray-200"
                >
                  PDV
                </th>
                <th></th>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-center px-1 py-3 font-semibold text-gray-700 w-10 text-xs">
                  R.Br.
                </th>
                <th className="text-left px-1 py-3 font-semibold text-gray-700 w-20 text-xs">
                  Sifra
                </th>
                <th className="text-left px-1 py-3 font-semibold text-gray-700 min-w-[160px] text-xs">
                  Naziv dobra/usluge
                </th>
                <th className="text-center px-1 py-3 font-semibold text-gray-700 w-14 text-xs">
                  Jed.
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-16 text-xs">
                  Kol.
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-20 text-xs">
                  Prod. cena
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-24 text-xs">
                  Prod. vr.
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-20 text-xs">
                  Nova cena
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-24 text-xs">
                  Nova vr.
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-20 text-xs border-l border-gray-200">
                  +
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-20 text-xs">
                  −
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-20 text-xs border-l border-gray-200">
                  Stara
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-20 text-xs">
                  Nova
                </th>
                <th className="text-left px-1 py-3 font-semibold text-gray-700 w-24 text-xs">
                  Napomena
                </th>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">1</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">2</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">3</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">4</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">5</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">6</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">7=5x6</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">8</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">9=5x8</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">10</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">11</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">12</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">13</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">14</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const c = calcRow(item);
                const isEmpty = !item.productName.trim();
                const hasValues = (parseFloat(item.quantity) || 0) > 0;
                return (
                  <tr
                    key={i}
                    className={`border-b border-gray-100${isEmpty ? " print-empty-row" : ""}`}
                  >
                    <td className="px-1 py-1 text-center text-gray-500 text-xs">
                      {i + 1}
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.articleCode}
                        onChange={(e) =>
                          updateItem(i, { articleCode: e.target.value })
                        }
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-xs">
                        {item.articleCode}
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <div className="no-print">
                        <ProductSearch
                          products={products}
                          value={item.productName}
                          selectedProductId={item.productId}
                          onChange={(name, productId, price) => {
                            const updates: Partial<ItemRow> = {
                              productName: name,
                              productId: productId,
                              articleCode: "",
                              oldPrice: "",
                              newPrice: "",
                              quantity: "",
                              note: "",
                            };
                            if (price !== null) {
                              updates.oldPrice = String(price);
                            }
                            if (productId && affectsStock) {
                              const linked = productById(productId);
                              if (linked) {
                                updates.quantity = String(linked.amount);
                              }
                            }
                            updateItem(i, updates);
                          }}
                        />
                      </div>
                      <span className="print-only text-xs">
                        {item.productName}
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) =>
                          updateItem(i, { unit: e.target.value })
                        }
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-xs text-center block">
                        {item.unit}
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      {(() => {
                        const linked = productById(item.productId);
                        const locked = affectsStock && !!linked;
                        return (
                          <>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(i, { quantity: e.target.value })
                              }
                              readOnly={locked}
                              min="0"
                              className={`w-full px-1 py-1 border rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input ${
                                locked
                                  ? "border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                                  : "border-gray-300"
                              }`}
                              title={
                                locked
                                  ? `Zakljucano: kolicina iz magacina (${linked!.amount})`
                                  : undefined
                              }
                            />
                            <span className="print-only text-xs text-right block">
                              {item.quantity}
                            </span>
                          </>
                        );
                      })()}
                    </td>
                    <td className="px-1 py-1">
                      {(() => {
                        const linked = productById(item.productId);
                        const locked = affectsStock && !!linked;
                        return (
                          <>
                            <input
                              type="number"
                              value={item.oldPrice}
                              onChange={(e) =>
                                updateItem(i, { oldPrice: e.target.value })
                              }
                              readOnly={locked}
                              min="0"
                              step="0.01"
                              className={`w-full px-1 py-1 border rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input ${
                                locked
                                  ? "border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed"
                                  : "border-gray-300"
                              }`}
                              title={
                                locked
                                  ? `Zakljucano: cena iz magacina (${linked!.price})`
                                  : undefined
                              }
                            />
                            <span className="print-only text-xs text-right block">
                              {item.oldPrice}
                            </span>
                          </>
                        );
                      })()}
                    </td>
                    {/* Col 7: Stara vrednost (auto) */}
                    <td className="px-1 py-1 text-right text-xs text-gray-900 whitespace-nowrap">
                      {hasValues ? formatRSD(c.oldValue) : ""}
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.newPrice}
                        onChange={(e) =>
                          updateItem(i, { newPrice: e.target.value })
                        }
                        min="0"
                        step="0.01"
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-xs text-right block">
                        {item.newPrice}
                      </span>
                    </td>
                    {/* Col 9: Nova vrednost (auto) */}
                    <td className="px-1 py-1 text-right text-xs text-gray-900 font-medium whitespace-nowrap">
                      {hasValues ? formatRSD(c.newValue) : ""}
                    </td>
                    {/* Col 10: + (markup) */}
                    <td className="px-1 py-1 text-right text-xs text-green-700 whitespace-nowrap border-l border-gray-100">
                      {hasValues && c.diffPlus > 0 ? formatRSD(c.diffPlus) : ""}
                    </td>
                    {/* Col 11: − (markdown) */}
                    <td className="px-1 py-1 text-right text-xs text-red-700 whitespace-nowrap">
                      {hasValues && c.diffMinus > 0
                        ? formatRSD(c.diffMinus)
                        : ""}
                    </td>
                    {/* Col 12: Stara PDV */}
                    <td className="px-1 py-1 text-right text-xs text-gray-700 whitespace-nowrap border-l border-gray-100">
                      {hasValues ? formatRSD(c.oldVat) : ""}
                    </td>
                    {/* Col 13: Nova PDV */}
                    <td className="px-1 py-1 text-right text-xs text-gray-700 whitespace-nowrap">
                      {hasValues ? formatRSD(c.newVat) : ""}
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="text"
                        value={item.note}
                        onChange={(e) =>
                          updateItem(i, { note: e.target.value })
                        }
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-xs">{item.note}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td
                  colSpan={6}
                  className="px-2 py-3 text-right font-bold text-gray-900 text-xs"
                >
                  Ukupno:
                </td>
                <td className="px-1 py-3 text-right font-bold text-gray-900 text-xs whitespace-nowrap">
                  {formatRSD(totals.oldValue)}
                </td>
                <td></td>
                <td className="px-1 py-3 text-right font-bold text-gray-900 text-xs whitespace-nowrap">
                  {formatRSD(totals.newValue)}
                </td>
                <td className="px-1 py-3 text-right font-bold text-green-700 text-xs whitespace-nowrap border-l border-gray-200">
                  {formatRSD(totals.diffPlus)}
                </td>
                <td className="px-1 py-3 text-right font-bold text-red-700 text-xs whitespace-nowrap">
                  {formatRSD(totals.diffMinus)}
                </td>
                <td className="px-1 py-3 text-right font-bold text-gray-900 text-xs whitespace-nowrap border-l border-gray-200">
                  {formatRSD(totals.oldVat)}
                </td>
                <td className="px-1 py-3 text-right font-bold text-gray-900 text-xs whitespace-nowrap">
                  {formatRSD(totals.newVat)}
                </td>
                <td></td>
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

      {/* Signature */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datum
            </label>
            <input
              type="date"
              value={dateIssued}
              readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600 no-print-input"
            />
            <div className="print-only text-sm">
              {new Date(dateIssued + "T00:00:00").toLocaleDateString(
                "sr-Latn-RS",
                {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                }
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Racunopolagac
            </label>
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Potpis"
            />
            <div className="print-only mt-8 border-t border-gray-400 pt-1 text-sm text-center">
              {signedBy || "___________________"}
              <p className="text-xs text-gray-500 mt-1">(Racunopolagac)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom save buttons */}
      <div className="mt-4 flex gap-2 no-print">
        <button
          onClick={() => router.push("/nivelacije")}
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
