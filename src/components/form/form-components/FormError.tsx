import React from "react";

interface FormErrorProps {
  error?: string;
}

const FormError: React.FC<FormErrorProps> = ({ error }) =>
  error ? <p className="text-sm text-red-500 mb-4">{error}</p> : null;

export default FormError;
