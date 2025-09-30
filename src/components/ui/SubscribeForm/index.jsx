import { useState } from "react";
import { useRouter } from "next/router";
import Button from "../Button";
import Input from "../Input";

const SubscribeForm = () => {
  const [email, setEmail] = useState("");
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) return;
    sessionStorage.setItem("quinoia_email", email);
    router.push("/formulaire");
  };

  return (
    <form onSubmit={handleSubmit} className="items-center gap-x-3 sm:flex">
      <div className="relative">
        <svg
          className="w-6 h-6 text-[#8A8A8A] absolute left-3 inset-y-0 my-auto pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
          />
        </svg>
        <Input
          type="email"
          required
          placeholder="Ton adresse email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full pl-12 pr-3 focus:border-[#F4C95D] text-[#414535]"
        />
      </div>
      <Button
        type="submit"
        className="block w-full mt-3 bg-[#F4C95D] hover:bg-[#f3b930] text-[#414535] font-semibold ring-offset-2 ring-[#F4C95D] focus:ring shadow sm:w-auto sm:mt-0"
      >
        Essayer gratuitement
      </Button>
    </form>
  );
};
export default SubscribeForm;
