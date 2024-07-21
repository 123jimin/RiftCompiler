import * as fs from 'node:fs/promises';
import { TextChart } from "./text-chart.js";
import { resolvePath } from "./util.js";

/** @typedef {{file: string, out: string, watch: boolean}} Args */

export class Main {
    args; /** @type {Args} */
    /**
     * @param {Args} args 
     */
    constructor(args) {
        this.args = args;
    }

    async run() {
        await this.convert();
        if(this.args.watch) await this.watch();
    }

    async convert() {
        const src = await fs.readFile(resolvePath(this.args.file), 'utf-8');
        const chart = TextChart.parse(src);

        await fs.writeFile(resolvePath(this.args.out), JSON.stringify(chart), 'utf-8');
    }

    async watch() {
        console.log("Watching for changes...");
        
        /** @type {ReturnType<setTimeout>|null} */
        let convert_timeout_id = null;

        for await(const event of fs.watch(resolvePath(this.args.file))) {
            if(convert_timeout_id) continue;
            convert_timeout_id = setTimeout(async () => {
                console.log(`\x1Bc[${(new Date).toISOString()}] Applying changes...`);

                await this.convert();
                convert_timeout_id = null;
            }, 50);
        }
    }
}