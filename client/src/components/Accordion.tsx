import { ReactNode, SyntheticEvent } from "react";

export const Accordion = ({
  children,
  onToggle,
  title,
}: {
  children: ReactNode;
  onToggle?: (isOpen: boolean) => void;
  title: string;
}) => {
  return (
    <section id="accordion" className="accordion">
      <div className="accordion-container">
        <details
          className="accordion-item"
          onToggle={(event: SyntheticEvent<HTMLDetailsElement>) => onToggle?.(event.currentTarget.open)}
        >
          <summary className="accordion-trigger">
            <span className="accordion-title h4">{title}</span>
            <img
              className="accordion-icon"
              alt=""
              aria-hidden="true"
              src="https://sdk-style.s3.amazonaws.com/icons/chevronDown.svg"
            />
          </summary>
          <div className="accordion-content mt-4">{children}</div>
        </details>
      </div>
    </section>
  );
};

export default Accordion;
