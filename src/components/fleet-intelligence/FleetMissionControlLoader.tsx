import "./fleet-mission-control-loader.css";

const DEFAULT_MESSAGES = [
  "Syncing operational feed…",
  "Loading fleet positions…",
  "Preparing mission control…",
] as const;

type FleetMissionControlLoaderProps = {
  variant?: "page" | "overlay";
  testId?: string;
  className?: string;
  messages?: readonly string[];
  title?: string;
  eyebrow?: string;
};

export function FleetMissionControlLoader({
  variant = "page",
  testId = "fleet-mission-control-loading",
  className = "",
  messages = DEFAULT_MESSAGES,
  title = "Mission Control",
  eyebrow = "Fleet Intelligence",
}: FleetMissionControlLoaderProps) {
  return (
    <div
      className={`fleet-mcl fleet-mcl--${variant} ${className}`.trim()}
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={`${title} loading`}
    >
      <div className="fleet-mcl__grid" aria-hidden />
      <div className="fleet-mcl__scanline" aria-hidden />
      <div className="fleet-mcl__core">
        <div className="fleet-mcl__radar" aria-hidden>
          <span className="fleet-mcl__ring fleet-mcl__ring--1" />
          <span className="fleet-mcl__ring fleet-mcl__ring--2" />
          <span className="fleet-mcl__ring fleet-mcl__ring--3" />
          <span className="fleet-mcl__pulse" />
          <span className="fleet-mcl__sweep" />
          <span className="fleet-mcl__core-dot" />
        </div>
        <p className="fleet-mcl__eyebrow">{eyebrow}</p>
        <h2 className="fleet-mcl__title">{title}</h2>
        <div className="fleet-mcl__messages" aria-hidden>
          {messages.map((message) => (
            <p key={message} className="fleet-mcl__message">
              {message}
            </p>
          ))}
        </div>
        <div className="fleet-mcl__progress" aria-hidden>
          <span className="fleet-mcl__progress-bar" />
        </div>
      </div>
    </div>
  );
}
