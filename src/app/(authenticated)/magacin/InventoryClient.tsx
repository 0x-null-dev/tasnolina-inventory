"use client";

import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import Modal from "@/components/Modal";

interface Product {
  id: string;
  name: string;
  price: number;
  amount: number;
}

function formatRSD(value: number) {
  return value.toLocaleString("sr-Latn-RS");
}

export default function InventoryClient({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [addOpen, setAddOpen] = useState(false);
  const [editModal, setEditModal] = useState<{
    product: Product;
    field: "name" | "price" | "amount";
  } | null>(null);

  const grandTotal = products.reduce(
    (sum, p) => sum + p.price * p.amount,
    0
  );

  // --- Add product ---
  const [addName, setAddName] = useState("");
  const [addPrice, setAddPrice] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError("");
    const price = parseFloat(addPrice);
    const amount = parseInt(addAmount || "0", 10);

    if (!addName.trim()) {
      setAddError("Naziv je obavezan");
      return;
    }
    if (isNaN(price) || price <= 0) {
      setAddError("Cena mora biti veca od 0");
      return;
    }
    if (isNaN(amount) || amount < 0) {
      setAddError("Kolicina ne moze biti negativna");
      return;
    }

    setAddLoading(true);
    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: addName.trim(), price, amount }),
    });

    if (!res.ok) {
      const data = await res.json();
      setAddError(data.error || "Greska pri dodavanju");
      setAddLoading(false);
      return;
    }

    const product = await res.json();
    setProducts((prev) =>
      [...prev, product].sort((a, b) => a.name.localeCompare(b.name))
    );
    setAddName("");
    setAddPrice("");
    setAddAmount("");
    setAddOpen(false);
    setAddLoading(false);
    toast.success(`"${product.name}" dodat u magacin`);
  };

  // --- Delete product ---
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleDelete = async () => {
    if (!deleteProduct) return;
    setDeleteLoading(true);

    const res = await fetch(`/api/products/${deleteProduct.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      toast.error(data.error || "Greska pri brisanju");
      setDeleteLoading(false);
      setDeleteProduct(null);
      return;
    }

    const name = deleteProduct.name;
    setProducts((prev) => prev.filter((p) => p.id !== deleteProduct.id));
    setDeleteProduct(null);
    setDeleteLoading(false);
    toast.success(`"${name}" obrisan iz magacina`);
  };

  // --- Edit price/amount ---
  const [editValue, setEditValue] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  const openEdit = (product: Product, field: "name" | "price" | "amount") => {
    setEditModal({ product, field });
    setEditValue("");
    setEditError("");
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    setEditError("");

    if (!editValue.trim()) {
      setEditError("Unesite vrednost");
      return;
    }

    setEditLoading(true);
    const res = await fetch(`/api/products/${editModal.product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field: editModal.field, value: editValue.trim() }),
    });

    if (!res.ok) {
      const data = await res.json();
      setEditError(data.error || "Greska pri izmeni");
      setEditLoading(false);
      return;
    }

    const updated = await res.json();
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    setEditModal(null);
    setEditLoading(false);
    toast.success(
      editModal.field === "name"
        ? `Naziv azuriran u "${updated.name}"`
        : editModal.field === "price"
        ? `Cena za "${updated.name}" azurirana`
        : `Kolicina za "${updated.name}" azurirana`
    );
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Magacin</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {products.length}{" "}
            {products.length === 1 ? "proizvod" : "proizvoda"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Stampaj
          </button>
          <button
            onClick={() => {
              setAddName("");
              setAddPrice("");
              setAddAmount("");
              setAddError("");
              setAddOpen(true);
            }}
            className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Dodaj proizvod
          </button>
        </div>
      </div>

      {/* Grand total card */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 no-print">
        <p className="text-sm text-gray-500">Ukupna vrednost magacina</p>
        <p className="text-2xl font-bold text-gray-900">
          {formatRSD(grandTotal)} RSD
        </p>
      </div>

      {/* Print header */}
      <div className="print-only mb-6">
        <div className="flex items-center justify-between border-b-2 border-red-600 pb-3">
          <div>
            <Image src="/logo.webp" alt="Tasnolina" width={120} height={60} />
            <p className="text-sm text-gray-500 mt-1">Inventar magacina</p>
          </div>
          <div className="text-right text-sm text-gray-600">
            <p>
              Datum:{" "}
              {new Date().toLocaleDateString("sr-Latn-RS", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 font-semibold text-gray-700">
                  Naziv proizvoda
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">
                  Cena (RSD)
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">
                  Kolicina
                </th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">
                  Ukupno
                </th>
                <th className="px-4 py-3 no-print w-[1%]"></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center py-12 text-gray-400"
                  >
                    Nema proizvoda u magacinu
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 hover:bg-gray-50/50"
                  >
                    <td className="px-4 py-3 text-gray-900 font-medium">
                      {p.name}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 whitespace-nowrap">
                      {formatRSD(p.price)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {p.amount}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium whitespace-nowrap">
                      {formatRSD(p.price * p.amount)}
                    </td>
                    <td className="px-4 py-3 no-print">
                      <div className="flex gap-1 justify-end">
                        <button
                          onClick={() => openEdit(p, "name")}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors whitespace-nowrap"
                        >
                          Naziv
                        </button>
                        <button
                          onClick={() => openEdit(p, "price")}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors whitespace-nowrap"
                        >
                          Cena
                        </button>
                        <button
                          onClick={() => openEdit(p, "amount")}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors whitespace-nowrap"
                        >
                          Kol.
                        </button>
                        <button
                          onClick={() => setDeleteProduct(p)}
                          className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors whitespace-nowrap"
                        >
                          Obrisi
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {products.length > 0 && (
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td className="px-4 py-3 font-bold text-gray-900">Ukupno</td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3"></td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 whitespace-nowrap">
                    {formatRSD(grandTotal)} RSD
                  </td>
                  <td className="px-4 py-3 no-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Add Product Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Dodaj proizvod"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Naziv
            </label>
            <input
              type="text"
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              placeholder="Unesite naziv proizvoda"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cena (RSD)
            </label>
            <input
              type="number"
              value={addPrice}
              onChange={(e) => setAddPrice(e.target.value)}
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kolicina
            </label>
            <input
              type="number"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              min="0"
              step="1"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              placeholder="0"
            />
          </div>
          {addError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {addError}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Otkazi
            </button>
            <button
              type="submit"
              disabled={addLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {addLoading ? "Dodavanje..." : "Dodaj"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        title="Obrisi proizvod"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Da li ste sigurni da zelite da obrisete{" "}
            <strong>&quot;{deleteProduct?.name}&quot;</strong>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-800">
              Ova akcija se ne moze ponistiti. Proizvod ce biti trajno obrisan.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setDeleteProduct(null)}
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

      {/* Edit Price/Amount Modal */}
      <Modal
        open={!!editModal}
        onClose={() => setEditModal(null)}
        title={
          editModal?.field === "name"
            ? `Promeni naziv — ${editModal.product.name}`
            : editModal?.field === "price"
            ? `Promeni cenu — ${editModal.product.name}`
            : `Promeni kolicinu — ${editModal?.product.name}`
        }
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-500">
              {editModal?.field === "name" ? "Trenutni naziv" : "Trenutna vrednost"}
            </p>
            <p className="text-lg font-semibold text-gray-900">
              {editModal?.field === "name"
                ? editModal.product.name
                : editModal?.field === "price"
                ? `${formatRSD(editModal.product.price)} RSD`
                : editModal?.product.amount}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {editModal?.field === "name" ? "Novi naziv" : "Nova vrednost"}
            </label>
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              autoFocus
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
              placeholder={
                editModal?.field === "name"
                  ? "Unesite novi naziv"
                  : editModal?.field === "price"
                  ? 'npr. 2500 ili +500 ili -200'
                  : 'npr. 12 ili +5 ili -3'
              }
            />
            {editModal?.field !== "name" && (
              <p className="text-xs text-gray-400 mt-1">
                Unesite novu vrednost ili koristite +/- za izmenu
              </p>
            )}
          </div>
          {editError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {editError}
            </p>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditModal(null)}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Otkazi
            </button>
            <button
              type="submit"
              disabled={editLoading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {editLoading ? "Cuvanje..." : "Sacuvaj"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
