import { avatarById } from "../data/gamification";

// Renders an unlockable avatar as a gradient disc with its emoji. Optionally
// dimmed + a lock overlay when the avatar is still locked.
export default function Avatar({
  id,
  size = 44,
  locked = false,
}: {
  id?: string;
  size?: number;
  locked?: boolean;
}) {
  const a = avatarById(id);
  return (
    <div
      className="relative rounded-full flex items-center justify-center shrink-0 border border-white/10"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, ${a.grad[0]}, ${a.grad[1]})`,
        opacity: locked ? 0.35 : 1,
        filter: locked ? "grayscale(0.7)" : "none",
      }}
      title={a.name}
    >
      <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{a.emoji}</span>
      {locked && (
        <span
          className="absolute inset-0 flex items-center justify-center"
          style={{ fontSize: size * 0.4 }}
        >
          🔒
        </span>
      )}
    </div>
  );
}
