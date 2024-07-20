//@ts-check

import { escapeRegExp } from "./util.js";

/** @typedef {{type: 'assign', name: string, value: string}} ChartLineAssign */
/** @typedef {{type: 'notes', duration: number, notes: string[]}} ChartLineNotes  */
/** @typedef {ChartLineAssign|ChartLineNotes} ChartLine */

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
    const define_group = define_keys.length > 0 ? `(${define_keys.map(escapeRegExp).join('|')}|\\S{1,3})\\s*` : `(\\S)\\s*`;
    return new RegExp(`^${define_group.repeat(3)}$`);
}

/**
 * @param {RegExp} chart_line_regexp
 * @param {string} src 
 * @returns {ChartLine|null}
 */
function parseChartLine(chart_line_regexp, src) {
    const sep_ind = src.indexOf('|');
    if(sep_ind < 0) {
        const sep_eq = src.indexOf('=');
        if(sep_eq <= 0) return null;

        const name = src.slice(0, sep_eq).trim();
        const value = src.slice(sep_eq+1).trim();

        return {type: 'assign', name, value};
    }

    const src_duration = src.slice(0, sep_ind).trim();
    const duration = src_duration ? parseFloat(src_duration) : 1.0;
    
    const str_chart_line_main = src.slice(sep_ind+1).trim();
    const match = str_chart_line_main.match(chart_line_regexp);

    if(match) {
        return {type: 'notes', duration, notes: [match[1], match[2], match[3]]};
    } else {
        return {type: 'notes', duration, notes: [str_chart_line_main]};
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

        let curr_beat = 0;
        line_loop: for(const line of lines) {
            switch(line.type) {
                case 'assign':
                    if(line.name === 'beatNumber') {
                        curr_beat = parseFloat(line.value);
                        continue line_loop;
                    }
                    break;
                case 'notes': {
                    let next_beat = curr_beat + line.duration;
                    if(!Number.isSafeInteger(next_beat)) {
                        next_beat = Math.round(next_beat * beatDivisions) / beatDivisions;
                    }

                    const notes = line.notes;
                    for(let track=0; track<notes.length; ++track) {
                        const str_note = notes[track];
        
                        let note_data = /** @type {object|null} */ null;
                        if(str_note in defines) {
                            note_data = defines[str_note];
                        } else if(str_note.length >= 4) {
                            note_data = JSON.parse(str_note);
                        } else if(str_note === '|') {
                            const prev_note = last_event_by_track[track];
                            if(prev_note) {
                                prev_note.endBeatNumber = next_beat;
                            }
                            continue;
                        }
        
                        if(note_data) {
                            const note_duration = ('duration' in note_data) ? note_data['duration'] : 1.0;

                            const event = {
                                track: track+1,
                                startBeatNumber: curr_beat,
                                endBeatNumber: curr_beat + note_duration,
                                ...note_data,
                            };

                            delete event.duration;
        
                            if('data' in event) event.data = {
                                ShouldClampToSubdivisions: true,
                                ...event.data,
                            };
        
                            events.push(event);
                            last_event_by_track[track] = event;
                        } else {
                            last_event_by_track[track] = null;
                        }
                    }

                    curr_beat = next_beat;
                    break;
                }
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
                        header[line.slice(0, equal_index).trimEnd()] = JSON.parse(line.slice(equal_index+1));
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
                        object_defines[define_key] = parseEvent(line.slice(equal_index+1).trimStart());
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