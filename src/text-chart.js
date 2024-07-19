export const ENEMY_MAP = Object.freeze({
    Nothing: -1,
    EnemyPlaceholder: 0,
    HealthPlaceholder: 1,

    GreenSlime: 1722,
    BlueSlime: 4355,
    YellowSlime: 9189,

    BaseSkeleton: 2202,
    ShieldSkeleton: 1911,
    YellowSkeleton: 6803,
    ShieldYellowSkeleton: 4871,
    BlackSkeleton: 2716,
    ShieldBlackSkeleton: 3307,
    TripleShieldBaseSkeleton: 6471,
    ShieldedSwungSkeleton: 1707,

    WyrmHead: 7794,
    WyrmBody: 8079,
    WyrmTail: 9888,

    BlueBat: 8675309,
    YellowBat: 717,
    RedBat: 911,

    BladeMaster: 929,
    StrongBladeMaster: 3685,

    Skull: 4601,
    StrongSkull: 3543,
    TrickySkull: 7685,

    GreenZombie: 1234,
    RedZombie: 1236,

    Cheese: 2054,
    Apple: 7358,
    Drumstick: 1817,
    Ham: 3211,
    Coin: 8883,
});

export class TextChart {
    constructor(header, lines) {
        this.data = {
            ...header,
            events: [],
        };

        let start_beat = 0;
        for(const str_line of lines) {
            // TODO
        }
    }

    toJSON() {
        return this.data;
    }

    /**
     * @param {string} src
     * @returns {TextChart}
     */
    static parse(src) {
        const header = {};
        
        /** @type {string[]} */
        const body_lines = [];

        let curr_part = "";

        for(let line of src.split("\n")) {
            line = line.trim();
            if(!line) continue;
            
            const match_header = line.match(/^\[\s*(?<name>header|body)\s*\]$/);
            if(match_header) {
                curr_part = match_header.groups.name;
                continue;
            }

            switch(curr_part) {
                case "header": {
                    const equal_index = line.indexOf('=');
                    if(equal_index) {
                        header[line.slice(0, equal_index).trimEnd()] = JSON.parse(line.slice(equal_index+1));
                    }
                    break;
                }
                case "body": {
                    body_lines.push(line);
                    break;
                }
            }
        }
        
        return new TextChart(header, body_lines.reverse());
    }
}