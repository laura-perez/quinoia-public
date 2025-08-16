import React from 'react';

const SectionWrapper = ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
  <section {...props} className={`py-20 sm:py-28 ${props.className || ""}`}>
    {children}
  </section>
);

export default SectionWrapper;
