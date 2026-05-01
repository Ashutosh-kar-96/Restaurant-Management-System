export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400 flex-shrink-0">
      <span>© {new Date().getFullYear()} RMS — Restaurant Management System. All rights reserved.</span>
      <div className="flex items-center gap-4">
        <span>v1.0.0</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          System Online
        </span>
      </div>
    </footer>
  );
}
