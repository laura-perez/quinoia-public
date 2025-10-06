import Link from "next/link";
import Brand from "../Brand";

const Navbar = ({ statusBadge }) => (
  <header
    className="bg-[#FDFBF8] border-b border-[#EAEAEA] text-[#414535] sticky top-0 z-50 backdrop-blur bg-opacity-90 transition-shadow duration-300"
    id="navbar"
  >
    <nav className="custom-screen py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2">
        <Brand />
      </Link>

      {/* Status Badge (if provided) */}
      {statusBadge && (
        <div>
          {statusBadge}
        </div>
      )}
    </nav>
  </header>
);

export default Navbar;
