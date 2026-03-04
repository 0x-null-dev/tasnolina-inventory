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
  pricePerUnit: string;
  dependentCosts: string;
  priceDifference: string;
  note: string;
}

interface CalculationData {
  id?: string;
  number: string;
  deliveryNumber: string | null;
  dateIssued: string;
  affectsStock: boolean;
  signedBy: string;
  responsiblePerson: string;
  items: {
    productId: string | null;
    productName: string;
    unit: string;
    quantity: number;
    pricePerUnit: number;
    dependentCosts: number;
    priceDifference: number;
    note: string | null;
  }[];
}

function emptyRow(): ItemRow {
  return {
    productId: null,
    productName: "",
    unit: "kom",
    quantity: "",
    pricePerUnit: "",
    dependentCosts: "",
    priceDifference: "",
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

export default function KalkulacijaFormClient({
  products,
  existing,
}: {
  products: Product[];
  existing?: CalculationData;
}) {
  const router = useRouter();
  const isEdit = !!existing;

  const [number, setNumber] = useState(existing?.number || "");
  const [deliveryNumber, setDeliveryNumber] = useState(
    existing?.deliveryNumber || ""
  );
  const [dateIssued, setDateIssued] = useState(
    existing?.dateIssued ? existing.dateIssued.split("T")[0] : todayISO()
  );
  const [signedBy, setSignedBy] = useState(existing?.signedBy || "");
  const [responsiblePerson, setResponsiblePerson] = useState(
    existing?.responsiblePerson || ""
  );
  const [affectsStock, setAffectsStock] = useState(
    existing?.affectsStock || false
  );

  const year = dateIssued ? new Date(dateIssued + "T00:00:00").getFullYear() : new Date().getFullYear();

  const initialItems: ItemRow[] = existing?.items
    ? existing.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        unit: item.unit,
        quantity: String(item.quantity),
        pricePerUnit: String(item.pricePerUnit),
        dependentCosts: item.dependentCosts ? String(item.dependentCosts) : "",
        priceDifference: item.priceDifference
          ? String(item.priceDifference)
          : "",
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
    const price = parseFloat(row.pricePerUnit) || 0;
    const dep = parseFloat(row.dependentCosts) || 0;
    const diff = parseFloat(row.priceDifference) || 0;

    const goodsValue = qty * price; // col 6
    const sellingPriceNoVat = goodsValue + dep + diff; // col 9
    const vatAmount = sellingPriceNoVat * VAT_RATE; // col 11
    const sellingPriceVat = sellingPriceNoVat + vatAmount; // col 12
    const sellingPriceUnit = qty > 0 ? sellingPriceVat / qty : 0; // col 13

    return {
      goodsValue,
      sellingPriceNoVat,
      vatAmount,
      sellingPriceVat,
      sellingPriceUnit,
    };
  };

  // Footer totals
  const totals = items.reduce(
    (acc, row) => {
      const c = calcRow(row);
      return {
        priceDifference: acc.priceDifference + (parseFloat(row.priceDifference) || 0),
        sellingPriceNoVat: acc.sellingPriceNoVat + c.sellingPriceNoVat,
        vatAmount: acc.vatAmount + c.vatAmount,
        sellingPriceVat: acc.sellingPriceVat + c.sellingPriceVat,
        sellingPriceUnit: acc.sellingPriceUnit + c.sellingPriceUnit,
      };
    },
    {
      priceDifference: 0,
      sellingPriceNoVat: 0,
      vatAmount: 0,
      sellingPriceVat: 0,
      sellingPriceUnit: 0,
    }
  );

  const handleSave = async () => {
    setError("");

    if (!number.trim()) {
      setError("Broj kalkulacije je obavezan");
      return;
    }

    const validItems = items
      .filter(
        (item) => item.productName.trim() && parseFloat(item.quantity) > 0
      )
      .map((item) => {
        const c = calcRow(item);
        return {
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          quantity: parseInt(item.quantity, 10) || 0,
          pricePerUnit: parseFloat(item.pricePerUnit) || 0,
          goodsValue: c.goodsValue,
          dependentCosts: parseFloat(item.dependentCosts) || 0,
          priceDifference: parseFloat(item.priceDifference) || 0,
          sellingPriceNoVat: c.sellingPriceNoVat,
          vatRate: VAT_RATE,
          vatAmount: c.vatAmount,
          sellingPriceVat: c.sellingPriceVat,
          sellingPriceUnit: c.sellingPriceUnit,
          note: item.note.trim() || null,
        };
      });

    setLoading(true);

    const url = isEdit
      ? `/api/calculations/${existing!.id}`
      : "/api/calculations";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: number.trim(),
        deliveryNumber: deliveryNumber.trim() || null,
        dateIssued,
        affectsStock,
        signedBy: signedBy.trim() || null,
        responsiblePerson: responsiblePerson.trim() || null,
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
        ? `Kalkulacija br. ${number} azurirana`
        : `Kalkulacija br. ${number} sacuvana`
    );
    window.location.href = "/kalkulacije";
  };

  return (
    <div>
      {/* Screen header */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit
              ? `Kalkulacija br. ${existing!.number}`
              : "Nova kalkulacija"}
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
          </div>
        </div>
        <div className="mt-3 text-center">
          <h2 className="text-lg font-bold">
            KALKULACIJA PRODAJNE CENE br. {number}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Po dokumentu — Otpremnica broj: {deliveryNumber || "—"} | Od:{" "}
            {new Date(dateIssued + "T00:00:00").toLocaleDateString("sr-Latn-RS", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}{" "}
            | Godine: {year}
          </p>
        </div>
      </div>

      {/* Header fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kalkulacija prodajne cene br.
            </label>
            <input
              type="text"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Unesite broj kalkulacije"
            />
            <span className="print-only text-sm font-bold">{number}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Po dokumentu — Otpremnica broj
            </label>
            <input
              type="text"
              value={deliveryNumber}
              onChange={(e) => setDeliveryNumber(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Broj otpremnice"
            />
            <span className="print-only text-sm">{deliveryNumber}</span>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Od (datum)
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
              Godine
            </label>
            <input
              type="text"
              value={year}
              readOnly
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-600 no-print-input"
            />
            <span className="print-only text-sm">{year}</span>
          </div>
        </div>

        {/* Fixed metadata */}
        <div className="mt-4 pt-4 border-t border-gray-100 no-print">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-500">
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
              Da li ova kalkulacija utice na magacin?
            </p>
            <p className="text-xs text-gray-500">
              Ako je ukljuceno, kolicine i prodajne cene proizvoda ce biti
              azurirane (cena po jed. sa PDV)
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
                <th className="text-center px-1 py-3 font-semibold text-gray-700 w-10 text-xs">
                  Rb.
                </th>
                <th className="text-left px-1 py-3 font-semibold text-gray-700 min-w-[160px] text-xs">
                  Naziv robe
                </th>
                <th className="text-center px-1 py-3 font-semibold text-gray-700 w-14 text-xs">
                  Jed.
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-16 text-xs">
                  Kol.
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-20 text-xs">
                  Cena/jed
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-24 text-xs">
                  Vr. robe
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-20 text-xs">
                  Zav.tr.
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-20 text-xs">
                  Raz.cene
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-24 text-xs">
                  Pr.vr.bez
                </th>
                <th className="text-center px-1 py-3 font-semibold text-gray-700 w-14 text-xs">
                  Stopa
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-22 text-xs">
                  Obr.izn.
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-24 text-xs">
                  Pr.vr.sa
                </th>
                <th className="text-right px-1 py-3 font-semibold text-gray-700 w-22 text-xs">
                  Pr.cena
                </th>
                <th className="text-left px-1 py-3 font-semibold text-gray-700 w-20 text-xs">
                  Nap.
                </th>
              </tr>
              <tr className="border-b border-gray-300 bg-gray-50">
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">1</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">2</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">3</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">4</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">5</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">6=4x5</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">7</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">8</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">9=6+7+8</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">10</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">11=9x10</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">12=9+11</th>
                <th className="text-center px-1 py-1 text-[10px] text-gray-400">13=12/4</th>
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
                              updates.pricePerUnit = String(price);
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
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(i, { quantity: e.target.value })
                        }
                        min="0"
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-xs text-right block">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.pricePerUnit}
                        onChange={(e) =>
                          updateItem(i, { pricePerUnit: e.target.value })
                        }
                        min="0"
                        step="0.01"
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-xs text-right block">
                        {item.pricePerUnit}
                      </span>
                    </td>
                    {/* Col 6: Vrednost robe = 4x5 (read-only) */}
                    <td className="px-1 py-1 text-right text-xs text-gray-900 whitespace-nowrap">
                      {hasValues ? formatRSD(c.goodsValue) : ""}
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.dependentCosts}
                        onChange={(e) =>
                          updateItem(i, { dependentCosts: e.target.value })
                        }
                        min="0"
                        step="0.01"
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-xs text-right block">
                        {item.dependentCosts}
                      </span>
                    </td>
                    <td className="px-1 py-1">
                      <input
                        type="number"
                        value={item.priceDifference}
                        onChange={(e) =>
                          updateItem(i, { priceDifference: e.target.value })
                        }
                        step="0.01"
                        className="w-full px-1 py-1 border border-gray-300 rounded text-xs text-right focus:outline-none focus:ring-1 focus:ring-red-500 no-print-input"
                      />
                      <span className="print-only text-xs text-right block">
                        {item.priceDifference}
                      </span>
                    </td>
                    {/* Col 9: Prod. vr. bez PDV = 6+7+8 (read-only) */}
                    <td className="px-1 py-1 text-right text-xs text-gray-900 whitespace-nowrap">
                      {hasValues ? formatRSD(c.sellingPriceNoVat) : ""}
                    </td>
                    {/* Col 10: Stopa (fixed 20%) */}
                    <td className="px-1 py-1 text-center text-xs text-gray-500">
                      {hasValues ? "20%" : ""}
                    </td>
                    {/* Col 11: Obracunati iznos = 9x10 (read-only) */}
                    <td className="px-1 py-1 text-right text-xs text-gray-900 whitespace-nowrap">
                      {hasValues ? formatRSD(c.vatAmount) : ""}
                    </td>
                    {/* Col 12: Prod. vr. sa PDV = 9+11 (read-only) */}
                    <td className="px-1 py-1 text-right text-xs text-gray-900 font-medium whitespace-nowrap">
                      {hasValues ? formatRSD(c.sellingPriceVat) : ""}
                    </td>
                    {/* Col 13: Prod. cena po jed. = 12/4 (read-only) */}
                    <td className="px-1 py-1 text-right text-xs text-gray-900 font-medium whitespace-nowrap">
                      {hasValues ? formatRSD(c.sellingPriceUnit) : ""}
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
                      <span className="print-only text-xs">
                        {item.note}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td
                  colSpan={7}
                  className="px-2 py-3 text-right font-bold text-gray-900 text-xs"
                >
                  Ukupno:
                </td>
                <td className="px-1 py-3 text-right font-bold text-gray-900 text-xs whitespace-nowrap">
                  {formatRSD(totals.priceDifference)}
                </td>
                <td className="px-1 py-3 text-right font-bold text-gray-900 text-xs whitespace-nowrap">
                  {formatRSD(totals.sellingPriceNoVat)}
                </td>
                <td></td>
                <td className="px-1 py-3 text-right font-bold text-gray-900 text-xs whitespace-nowrap">
                  {formatRSD(totals.vatAmount)}
                </td>
                <td className="px-1 py-3 text-right font-bold text-gray-900 text-xs whitespace-nowrap">
                  {formatRSD(totals.sellingPriceVat)}
                </td>
                <td className="px-1 py-3 text-right font-bold text-gray-900 text-xs whitespace-nowrap">
                  {formatRSD(totals.sellingPriceUnit)}
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

      {/* Footnotes (print) */}
      <div className="print-only text-[9px] text-gray-500 mb-4 space-y-1">
        <p>
          1 preduzetnici - obveznici PDV, unose nabavnu vrednost robe bez
          obracunatog PDV u fakturi dobavljaca
        </p>
        <p>
          2 preduzetnici - obveznici PDV, unose vrednost zavisnih troskova bez
          obracunatog PDV iz fakture
        </p>
      </div>

      {/* Signature fields */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Sastavio
            </label>
            <input
              type="text"
              value={signedBy}
              onChange={(e) => setSignedBy(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Potpis"
            />
            <div className="print-only mt-8 border-t border-gray-400 pt-1 text-sm">
              {signedBy || "___________________"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Odgovorno lice
            </label>
            <input
              type="text"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm no-print-input"
              placeholder="Potpis"
            />
            <div className="print-only mt-8 border-t border-gray-400 pt-1 text-sm">
              {responsiblePerson || "___________________"}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom save button (mobile convenience) */}
      <div className="mt-4 flex gap-2 no-print">
        <button
          onClick={() => router.push("/kalkulacije")}
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
