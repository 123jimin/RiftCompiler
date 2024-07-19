//@ts-check

import { escapeRegExp } from "./util.js";

/** @typedef {{beat: {type: '+'|'=', amount: number}, notes: string[]}} ChartLine */

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

/**
 * @param {string} src 
 */
export function parseEvent(src) {
    if(src in ENEMY_MAP) {
        return {
            type: "SpawnEnemy",
            data: {
                EnemyId: ENEMY_MAP[src],
            },
        };
    }

    return JSON.parse(src);
}

/**
 * @param {string[]} define_keys
 * @return {RegExp}
 */
function createChartLineRegExp(define_keys) {
    const define_group = define_keys.length > 0 ? `(${define_keys.map(escapeRegExp).join('|')}|\\S)\\s*` : `(\\S)\\s*`;
    return new RegExp(`^${define_group.repeat(3)}$`);
}

/**
 * @param {string} str
 * @returns {{type: '+'|'=', amount: number}|null}
 */
function parseChartLineBeat(str) {
    if(str[0] === '+' || str[0] === '=') {
        const str_amount = str.slice(1).trim();
        if(!str_amount) return {type: '+', amount: 0};
        return {
            type: str[0],
            amount: parseFloat(str_amount),
        };
    } else {
        return null;
    }
}

/**
 * @param {RegExp} chart_line_regexp
 * @param {string} src 
 * @returns {ChartLine|null}
 */
function parseChartLine(chart_line_regexp, src) {
    const sep_ind = src.indexOf('|');
    if(sep_ind <= 0) return null;

    const beat = parseChartLineBeat(src.slice(0, sep_ind));
    if(!beat) return null;

    const str_chart_line_main = src.slice(sep_ind+1).trim();
    const match = str_chart_line_main.match(chart_line_regexp);
    if(match) {
        return {beat, notes: [match[1], match[2], match[3]]};
    } else {
        return {beat, notes: [str_chart_line_main]};
    }
}

export class TextChart {
    /**
     * @param {Record<string, unknown>} header 
     * @param {Record<string, unknown>} defines 
     * @param {Array<ChartLine>} lines 
     */
    constructor(header, defines, lines) {
        const data = {
            bpm: 120,
            beatDivisions: 2,
            ...header,
            events: /** @type {Array<Record<string, unknown>>} */ ([]),
        };

        const {beatDivisions, events} = data;

        /** @type {Array<object|null>} */
        const last_event_by_track = [null, null, null];

        let start_beat = 0;
        for(const {beat, notes} of lines) {
            switch(beat.type) {
                case '+': start_beat += beat.amount; break;
                case '=': start_beat = beat.amount; break;
            }

            for(let track=0; track<notes.length; ++track) {
                const str_note = notes[track];
                const last_event = last_event_by_track[track];
                if(last_event) last_event.endBeatNumber = start_beat;

                let note_data = /** @type {object|null} */ null;
                if(str_note in defines) {
                    note_data = defines[str_note];
                } else if(str_note.length > 1) {
                    note_data = JSON.parse(str_note);
                } else if(str_note === '|') {
                    continue;
                }

                if(note_data) {
                    const event = {
                        track: track+1,
                        startBeatNumber: start_beat,
                        endBeatNumber: start_beat + 1.0,
                        ...note_data,
                    };

                    events.push(event);
                    last_event_by_track[track] = event;
                } else {
                    last_event_by_track[track] = null;
                }
            }
            
            if(!Number.isSafeInteger(start_beat)) {
                start_beat = Math.round(start_beat * beatDivisions) / beatDivisions;
            }
        }

        for(const event of events) {
            const data = event.data;
            if(data) {
                delete event.data;
                event.dataPairs = [...Object.entries(data)].map(([k, v]) => {
                    if(k === 'EnemyId' && v in ENEMY_MAP) v = ENEMY_MAP[v];
                    return {_eventDataKey: k, _eventDataValue: v};
                });
            }
        }

        this.data = data;
    }

    toJSON() {
        return this.data;
    }

    /**
     * @param {string} src
     * @returns {TextChart}
     */
    static parse(src) {
        /** @type {Record<string, unknown>} */
        const header = {};

        /** @type {Record<string, unknown>} */
        const object_defines = {};
        let chart_line_regexp = createChartLineRegExp([]);
        
        /** @type {Array<ChartLine>} */
        const body_lines = [];

        let curr_part = "";

        for(let line of src.split("\n")) {
            line = line.trim();
            if(!line || line.startsWith('#')) continue;
            
            const match_header = line.match(/^\[\s*(?<name>header|object|body)\s*\]$/);
            if(match_header) {
                curr_part = match_header.groups?.name ?? "";
                if(curr_part === 'body') {
                    chart_line_regexp = createChartLineRegExp([...Object.keys(object_defines)].sort((x, y) => y.length - x.length));
                }
                continue;
            }

            switch(curr_part) {
                case "header": {
                    const equal_index = line.indexOf('=');
                    if(equal_index > 0) {
                        header[line.slice(0, equal_index).trimEnd()] = parseEvent(line.slice(equal_index+1));
                    }
                    break;
                }
                case "object": {
                    const equal_index = line.indexOf('=');
                    if(equal_index > 0) {
                        const define_key = line.slice(0, equal_index).trimEnd();
                        if(define_key.match(/[\s#\-|]/)) {
                            throw new Error(`'${define_key}' can't be used as a name!`);
                        }
                        object_defines[define_key] = parseEvent(line.slice(equal_index+1));
                    }
                    break;
                }
                case "body": {
                    const chart_line = parseChartLine(chart_line_regexp, line);
                    if(chart_line) body_lines.push(chart_line);
                    break;
                }
            }
        }
        
        return new TextChart(header, object_defines, body_lines.reverse());
    }
}