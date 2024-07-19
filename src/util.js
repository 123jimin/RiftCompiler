import * as path from 'node:path';

/**
 * @param {string} str 
 */
export function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|\[\]\\]/g, '\\$&');
}

/**
 * @param {string} p 
 */
export function resolvePath(p) {
    if(path.isAbsolute(p)) return p;
    return path.join(process.cwd(), p);
}