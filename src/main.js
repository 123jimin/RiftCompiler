import * as fs from 'node:fs/promises';
import { TextChart } from "./text-chart.js";
import { resolvePath } from "./util.js";

/** @typedef {{file: string, out: string}} Args */

export class Main {
    args; /** @type {Args} */
    /**
     * @param {Args} args 
     */
    constructor(args) {
        this.args = args;
    }

    async convert() {
        const src = await fs.readFile(resolvePath(this.args.file), 'utf-8');
        const chart = TextChart.parse(src);

        await fs.writeFile(resolvePath(this.args.out), JSON.stringify(chart), 'utf-8');
    }
}