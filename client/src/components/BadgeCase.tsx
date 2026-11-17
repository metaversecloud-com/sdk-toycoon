import { useContext } from "react";

// context
import { GlobalStateContext } from "@/context/GlobalContext";

// utils
import { BADGE_TERM_LABELS, BADGES, BadgeTermType, normalizeBadgeName } from "@shared/constants";

const TERMS: BadgeTermType[] = ["short", "medium", "long"];

/**
 * Every Toycoon badge, three to a row, grouped by goal (getting started → legend). Earned badges are in full color; the
 * rest are grey and faded until earned. How to earn one shows in a tooltip (the SDK's tooltip classes, as in
 * .ai/examples/badges.md) on hover or keyboard focus, and is read out with the badge by screen readers. Pictures come
 * from the BADGE ecosystem items (matched by name); a badge without one yet shows a medal placeholder.
 */
export const BadgeCase = () => {
  const { ecosystemBadges, visitorInventory } = useContext(GlobalStateContext);

  const icons = Object.fromEntries(
    Object.values(ecosystemBadges || {}).map(({ name, icon }) => [normalizeBadgeName(name), icon]),
  );
  const owned = new Set(Object.values(visitorInventory?.badges || {}).map(({ name }) => normalizeBadgeName(name)));

  const badges = BADGES.map(({ id, name, description, term }) => ({
    id,
    name,
    description,
    term,
    icon: icons[normalizeBadgeName(name)] || "",
    isEarned: owned.has(normalizeBadgeName(name)) || owned.has(normalizeBadgeName(id)),
  }));
  const earnedCount = badges.filter(({ isEarned }) => isEarned).length;

  return (
    <div className="tc-badge-case">
      <p className="tc-badge-case__count">
        {earnedCount} of {badges.length} badges earned
      </p>
      {TERMS.map((term) => (
        <section key={term} aria-labelledby={`tc-badges-${term}`}>
          <h3 id={`tc-badges-${term}`} className="tc-badge-case__title">
            {BADGE_TERM_LABELS[term]}
          </h3>
          <ul className="tc-badge-grid">
            {badges
              .filter((badge) => badge.term === term)
              .map(({ id, name, description, icon, isEarned }) => (
                <li
                  key={id}
                  className={`tc-badge tooltip${isEarned ? "" : " tc-badge--locked"}`}
                  tabIndex={0}
                  aria-describedby={`tc-badge-tip-${id}`}
                  // Escape hides the tooltip and keeps focus here; it comes back once the badge is left
                  onKeyDown={(event) => {
                    if (event.key === "Escape") event.currentTarget.dataset.tipHidden = "true";
                  }}
                  onBlur={(event) => delete event.currentTarget.dataset.tipHidden}
                  onMouseLeave={(event) => delete event.currentTarget.dataset.tipHidden}
                >
                  <span className="tc-badge__art">
                    {icon ? <img src={icon} alt="" /> : <span aria-hidden="true">🏅</span>}
                  </span>
                  <span className="tc-badge__name">{name}</span>
                  {!isEarned && <span className="sr-only">Not earned yet.</span>}
                  <span id={`tc-badge-tip-${id}`} role="tooltip" className="tooltip-content p3 tc-badge__tooltip">
                    {description}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default BadgeCase;
