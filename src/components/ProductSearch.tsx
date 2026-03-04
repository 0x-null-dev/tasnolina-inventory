"use client";

import { useState, useRef, useEffect } from "react";

interface Product {
  id: string;
  name: string;
  price: number;
}

interface ProductSearchProps {
  products: Product[];
  value: string;
  selectedProductId: string | null;
  onChange: (name: string, productId: string | null, price: number | null) => void;
}

export default function ProductSearch({
  products,
  value,
  selectedProductId,
  onChange,
}: ProductSearchProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered = search
    ? products.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase())
      )
    : products;

  const isLinked = !!selectedProductId;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={search}
        onChange={(e) => {
          const val = e.target.value;
          setSearch(val);
          setOpen(true);
          // Clear the linked product when user types
          onChange(val, null, null);
        }}
        onFocus={() => setOpen(true)}
        className={`w-full px-2 py-1.5 border rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-transparent ${
          isLinked ? "border-green-300 bg-green-50/50" : "border-gray-300"
        }`}
        placeholder="Pocnite da kucate..."
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                setSearch(p.name);
                onChange(p.name, p.id, p.price);
                setOpen(false);
              }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex justify-between items-center ${
                p.id === selectedProductId ? "bg-green-50" : ""
              }`}
            >
              <span>{p.name}</span>
              <span className="text-xs text-gray-400">
                {p.price.toLocaleString("sr-Latn-RS")} RSD
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
