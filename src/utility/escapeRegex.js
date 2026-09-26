// Makes typed text safe to use inside a search pattern: ( ) + ? * etc.
// are matched literally instead of breaking the search.
const escapeRegex = (s) => String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export default escapeRegex;
