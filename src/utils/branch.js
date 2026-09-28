// This site's branch - the only place it is set (2026-09-27 audit). It used
// to be declared in seven files, and the live-update socket alone read it
// from an env var, so a wrong hosting variable would have put live updates
// on another branch while every request went to this one.
export const BRANCH_ID = 3;
