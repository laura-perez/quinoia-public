import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-100 py-6 px-4 text-sm text-[#414535]">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-center md:text-left">
          © {new Date().getFullYear()} Quinoïa. Tous droits réservés.
        </div>
        <div className="text-center md:text-right">
          <Link href="mailto:hello@quinoia.fr" className="hover:underline">
            Contact : hello@quinoia.fr
          </Link>
        </div>
      </div>
    </footer>
  );
}
