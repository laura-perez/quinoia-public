import Image from "next/image";

const Brand = () => (
  <Image
    src="/quinoia_logo.png"
    alt="Quinoïa Logo"
    width="140"
    height="42"
    priority
    style={{ width: 'auto', height: 'auto' }}
  />
);

export default Brand;
