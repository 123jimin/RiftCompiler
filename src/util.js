/**
 * @param {string} str 
 */
export function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
}