/**
 * @typedef {Array} JsonML
 * @property {string} 0 - HTML tag
 * @property {object} 1 - Attributes
 * @property {string|JsonML} [2] - First child
 * @property {string|JsonML} [3] - Second child
 * ...
 */

/**
 * @typedef {Object} Law
 * @property {string} pcode
 * @property {string} name
 * @property {string[]} [aliases]
 */

/**
 * @typedef {Object} ReplaceRule
 * @property {string | RegExp} pattern
 * @property {string} position - wheather this rule shall apply before or after static rules.
 * @property {function | Object} replacer
 */

/**
 * @typedef {Object | string} Fragment
 * @property {string} [type = text]
 * @property {string} text - text to be shown to the user
 * @property {string} [*] - other values to be passed to next step.
 */

/**
 * 條：article
 * 項：paragraph
 * 類：category
 * 款：subparagraph, subsection, sub-section
 * 目：item
 *
 * 編：part
 * 章：chapter
 * 節：section
 * 款：sub-section
 * 目：item
 *
 */