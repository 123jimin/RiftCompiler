//@ts-check

import { escapeRegExp } from "./util.js";

/** @typedef {{line_no: number}} ChartLineMetadata */
/** @typedef {{type: 'notes', duration: number, notes: string[]}} ChartLineNotes  */
/** @typedef {{type: 'invoke', name: string, params: string}} ChartLineInvoke */
/** @typedef {ChartLineMetadata & (ChartLineNotes|ChartLineInvoke)} ChartLine */

/** @typedef {Record<string, unknown>} ChartEvent */

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

    Harpy: 8519,
    QuickHarpy: 3826,
    StrongHarpy: 8156,

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
 * @param {number} curr_beat
 * @param {ChartEvent} event
 */
function adjustEventTiming(curr_beat, event) {
    const note_duration = ('duration' in event) ? /** @type {number} */ (event['duration']) : 1.0;
    delete event['duration'];

    if(!('startBeatNumber' in event)) event.startBeatNumber = curr_beat;

    let startBeatNumber = event.startBeatNumber;
    if((typeof startBeatNumber) !== 'number') startBeatNumber = parseFloat(/** @type {string} */ (startBeatNumber));

    if(!('endBeatNumber' in event)) event.endBeatNumber = /** @type {number} */ (startBeatNumber) + note_duration;

    if('data' in event) event.data = {
        ShouldClampToSubdivisions: true,
        ... /** @type {object} */ (event.data),
    };

    return event;
}

/**
 * @param {number} row 
 * @param {ChartEvent} event
 */
function adjustBladeMasterAttackRow(row, event) {
    if(row < 0) return event;
    if(event.type !== 'SpawnEnemy') return event;

    const event_data = /** @type {object} */ (event.data);
    if((typeof event_data) !== 'object') return event;

    if('BlademasterAttackRow' in event_data) return event;
    
    let enemyId = event_data['EnemyId'];
    if(!enemyId) return event;

    if(enemyId in ENEMY_MAP) enemyId = ENEMY_MAP[enemyId];

    if(enemyId === ENEMY_MAP.BladeMaster || enemyId === ENEMY_MAP.StrongBladeMaster) {
        event_data['BlademasterAttackRow'] = row;
    }

    return event;
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
 * @param {number} line_no
 * @param {RegExp} chart_line_regexp
 * @param {string} src 
 * @returns {ChartLine|null}
 */
function parseChartLine(line_no, chart_line_regexp, src) {
    if(src.startsWith('@')) {
        const sep_space = src.indexOf(' ');
        
        return {
            line_no,
            type: 'invoke',
            name: (sep_space < 0 ? src.slice(1) : src.slice(1, sep_space)).trim(),
            params: (sep_space < 0 ? '' : src.slice(sep_space+1).trim()),
        };
    }

    const sep_ind = src.indexOf('|');
    if(sep_ind < 0) {
        return null;
    }

    const src_duration = src.slice(0, sep_ind).trim();
    const duration = src_duration ? parseFloat(src_duration) : 1.0;
    
    const str_chart_line_main = src.slice(sep_ind+1).trim();
    const match = str_chart_line_main.match(chart_line_regexp);

    if(match) {
        return {line_no, type: 'notes', duration, notes: [match[1], match[2], match[3]]};
    } else {
        return {line_no, type: 'notes', duration, notes: [str_chart_line_main]};
    }
}

/** @typedef {{events: Array<ChartEvent>, beat_divisions: number, curr_beat: number, last_event_by_track: Array<object|null>, blade_master_attack_row: number}} TextChartProcessState */

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
            events: /** @type {Array<ChartEvent>} */ ([]),
        };

        /** @type {TextChartProcessState} */
        const process_state = {
            events: data.events,
            beat_divisions: data.beatDivisions,
            curr_beat: 0,
            last_event_by_track: [null, null, null],
            blade_master_attack_row: -1,
        };

        for(const line of lines) {
            try {
                switch(line.type) {
                    case 'notes': this.#processLineNotes(process_state, defines, line); break;
                    case 'invoke': this.#processLineInvoke(process_state, line); break;
                }
            } catch(e) {
                console.error(`Error at line ${line.line_no}!`);
                throw e;
            }
        }

        for(const event of process_state.events) {
            const data = event.data;
            if(data) {
                delete event.data;
                event.dataPairs = [...Object.entries(data)].map(([k, v]) => {
                    if(k === 'EnemyId' && v in ENEMY_MAP) v = ENEMY_MAP[v];
                    return {_eventDataKey: k, _eventDataValue: v};
                });
            }
        }

        data.events.sort((x, y) => {
            const x_beat = /** @type {number|undefined} */ (x['startBeatNumber']) ?? 0;
            const y_beat = /** @type {number|undefined} */ (y['startBeatNumber']) ?? 0;

            return x_beat - y_beat;
        });

        this.data = data;
    }

    /**
     * @param {TextChartProcessState} state 
     * @param {Record<string, unknown>} defines 
     * @param {ChartLineNotes} line 
     */
    #processLineNotes(state, defines, line) {
        const {events, beat_divisions, curr_beat, last_event_by_track} = state;

        let next_beat = curr_beat + line.duration;
        if(!Number.isSafeInteger(next_beat)) {
            next_beat = Math.round(next_beat * beat_divisions) / beat_divisions;
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
                let event = adjustEventTiming(curr_beat, {track: track+1, ...note_data});
                event = adjustBladeMasterAttackRow(state.blade_master_attack_row, event);
                
                events.push(event);
                last_event_by_track[track] = event;
            } else {
                last_event_by_track[track] = null;
            }
        }

        state.curr_beat = next_beat;
    }
    
    /**
     * 
     * @param {TextChartProcessState} state 
     * @param {ChartLineMetadata & ChartLineInvoke} line 
     */
    #processLineInvoke(state, line) {
        switch(line.name.toLowerCase()) {
            case 'beat': {
                state.curr_beat = parseFloat(line.params);
                break;
            }
            case 'blademasterattackrow':
            case 'blademasterrow':
            case 'bmattackrow':
            case 'bmrow': {
                state.blade_master_attack_row = parseInt(line.params);
                break;
            }
            case 'debug': {                            
                console.log(`(debug) Line ${line.line_no}: beatNumber=${state.curr_beat}${line.params ? ' | ' + line.params : ''}`);
                break;
            }
            case 'raw': {
                state.events.push(adjustEventTiming(state.curr_beat, JSON.parse(line.params)));
                break;
            }
            case 'portal': {
                const [duration, in_track, in_row, out_track, out_row] = JSON.parse(line.params);
                state.events.push({
                    track: in_track,
                    startBeatNumber: state.curr_beat + 8,
                    endBeatNumber: state.curr_beat + 9,
                    type: 'SpawnTrap',
                    data: {
                        TrapTypeToSpawn: 'PortalIn',
                        TrapDropRow: in_row,
                        TrapHealthInBeats: duration,
                        TrapColor: 0,
                        TrapChildSpawnLane: out_track,
                        TrapChildSpawnRow: out_row,
                    },
                });
                break;
            }
            default:
                throw new Error(`Unknown invoke name: ${line.name}`);
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
        /** @type {Record<string, unknown>} */
        const header = {};

        /** @type {Record<string, unknown>} */
        const object_defines = {};
        let chart_line_regexp = createChartLineRegExp([]);
        
        /** @type {Array<ChartLine>} */
        const body_lines = [];

        let curr_part = "";
        let line_no = 0;
        for(let line of src.split("\n")) {
            ++line_no;
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
                    const chart_line = parseChartLine(line_no, chart_line_regexp, line);
                    if(chart_line) body_lines.push(chart_line);
                    break;
                }
            }
        }
        
        return new TextChart(header, object_defines, body_lines.reverse());
    }
}