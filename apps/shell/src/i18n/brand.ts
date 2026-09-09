/**
 * Names, not words.
 *
 * These are the only user-visible strings in the shell that are not in a locale
 * file, and the reason is that translating them would be wrong: `ARCADE` is
 * what the product is called, and `POCKET ARCADE` is the engraving moulded into
 * the plastic of the fake handheld on the home page. A translated engraving
 * would look like a different device.
 *
 * Anything with a verb in it belongs in `en.ts`, not here.
 */
export const BRAND = 'ARCADE';
export const CONSOLE_BRAND = 'POCKET ARCADE';
