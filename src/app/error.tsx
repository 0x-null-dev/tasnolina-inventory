"use client";

export default function Error() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600">Greska</h1>
        <p className="text-gray-500 mt-2">Doslo je do greske</p>
        <a
          href="/magacin"
          className="mt-4 inline-block px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Nazad na magacin
        </a>
      </div>
    </div>
  );
}
