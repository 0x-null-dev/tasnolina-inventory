export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600">404</h1>
        <p className="text-gray-500 mt-2">Stranica nije pronadjena</p>
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
