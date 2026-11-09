import { useContext } from "react";

// context
import { GlobalStateContext } from "@/context/GlobalContext";

// utils
import { BADGE_TERM_LABELS, BADGES, BadgeTermType, normalizeBadgeName } from "@shared/constants";

const TERMS: BadgeTermType[] = ["short", "medium", "long"];

/**
 * Every Toycoon badge, grouped by goal (getting started → legend). Earned badges are in full color; the rest are grey and
 * faded until earned. Pictures come from the BADGE ecosystem items (matched by name); a badge without one yet shows a
 * medal placeholder.
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
                <li key={id} className={`tc-badge${isEarned ? "" : " tc-badge--locked"}`}>
                  <span className="tc-badge__art">
                    {icon ? <img src={icon} alt="" /> : <span aria-hidden="true">🏅</span>}
                  </span>
                  <span className="tc-badge__name">{name}</span>
                  <span className="tc-badge__description">{description}</span>
                  {!isEarned && <span className="sr-only">Not earned yet.</span>}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
};

export default BadgeCase;
