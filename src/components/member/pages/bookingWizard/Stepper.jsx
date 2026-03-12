import React from "react";
import "./bookingWizard.css";

export default function Stepper({ steps = [], current = 0 }) {
  const total = Array.isArray(steps) ? steps.length : 0;
  const safeCurrent = Math.min(Math.max(current, 0), Math.max(total - 1, 0));

  const progress =
    total <= 1 ? 0 : Math.round((safeCurrent / (total - 1)) * 100);

  return (
    <div className="bw-stepper" aria-label="Progress">
      {/* bar */}
      <div className="bw-stepperBar" aria-hidden="true">
        <div
          className="bw-stepperBarFill"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* nodes */}
      <ol
        className="bw-stepperGrid"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0,1fr))` }}
      >
        {steps.map((label, i) => {
          const done = i < safeCurrent;
          const active = i === safeCurrent;

          return (
            <li key={i} className="bw-stepperItem">
              <div className="bw-stepperInner">
                <div
                  className={[
                    "bw-stepCircle",
                    done ? "isDone" : "",
                    active ? "isActive" : "",
                  ].join(" ")}
                  title={label}
                  role="img"
                  aria-label={`${i + 1}. ${label}`}
                >
                  {i + 1}
                  <span className="bw-stepRing" aria-hidden="true" />
                </div>

                <span
                  className={[
                    "bw-stepLabel",
                    done || active ? "isOn" : "",
                  ].join(" ")}
                >
                  {label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}