/**
 * Module-level store for the File object selected during application form.
 * File objects cannot be serialized to sessionStorage/localStorage, but they
 * persist in module scope across React Router navigations (SPA — no page reload).
 */
let _file = null;

export function storeFile(file) { _file = file; }
export function getStoredFile() { return _file; }
export function clearStoredFile() { _file = null; }
