import Link from "next/link";
import Brand from "../Brand";

/**
 * General site Navbar — used across the marketing pages.
 * Minimal: Brand + login button on the right.
 */
const Navbar = () => (
  <header
    className="bg-[#FDFBF8] border-b border-[#EAEAEA] text-[#414535] sticky top-0 z-50 backdrop-blur bg-opacity-90 transition-shadow duration-300"
    id="navbar"
  >
    <nav className="custom-screen py-3 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Brand />
      </Link>

      <div>
        <Link
          href="/login"
          className="p-1 hover:bg-[#FAFAFA] rounded-lg transition-colors"
          title="Se connecter"
        >
          <svg
            className="w-6 h-6 text-[#414535]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </Link>
      </div>
    </nav>
  </header>
);

export default Navbar;
