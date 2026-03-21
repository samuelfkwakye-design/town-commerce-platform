"use client";

type Step = "cart" | "checkout" | "confirmation";

const steps: { key: Step; label: string; short: string }[] = [
  { key: "cart", label: "Cart", short: "1" },
  { key: "checkout", label: "Checkout", short: "2" },
  { key: "confirmation", label: "Confirmation", short: "3" },
];

function isComplete(current: Step, step: Step) {
  const order = ["cart", "checkout", "confirmation"];
  return order.indexOf(step) < order.indexOf(current);
}

function isCurrent(current: Step, step: Step) {
  return current === step;
}

export default function CheckoutProgress({ step }: { step: Step }) {
  return (
    <div className="w-full rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        {steps.map((item, index) => {
          const complete = isComplete(step, item.key);
          const current = isCurrent(step, item.key);

          return (
            <div key={item.key} className="flex flex-1 items-center">
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold",
                    complete
                      ? "border-black bg-black text-white"
                      : current
                      ? "border-black bg-white text-black"
                      : "border-gray-300 bg-gray-100 text-gray-500",
                  ].join(" ")}
                >
                  {item.short}
                </div>

                <div className="hidden sm:block">
                  <div
                    className={[
                      "text-sm font-medium",
                      complete || current ? "text-black" : "text-gray-500",
                    ].join(" ")}
                  >
                    {item.label}
                  </div>
                </div>
              </div>

              {index < steps.length - 1 ? (
                <div
                  className={[
                    "mx-2 h-[2px] flex-1 rounded",
                    complete ? "bg-black" : "bg-gray-200",
                  ].join(" ")}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
