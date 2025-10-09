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
    <nav className="custom-screen py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Brand />
      </Link>

      <div>
        <Link href="/login" className="px-4 py-2 rounded-md text-sm font-medium bg-[#414535] text-white hover:opacity-90">
          Se connecter
        </Link>
      </div>
    </nav>
  </header>
);

export default Navbar;
