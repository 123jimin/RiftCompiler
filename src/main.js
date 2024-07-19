import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { TextChart } from "./text-chart.js";

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
        const src = await fs.readFile(path.join(process.cwd(), this.args.file), 'utf-8');
        const chart = TextChart.parse(src);

        await fs.writeFile(path.join(process.cwd(), this.args.out), JSON.stringify(chart), 'utf-8');
    }
}