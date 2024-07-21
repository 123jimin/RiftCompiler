export type ChartEvent = Record<string, unknown>;

export interface TextChartProcessState {
    events: Array<ChartEvent>;
    last_event_by_track: Array<ChartEvent|null>;

    beat_divisions: number;
    curr_beat: number;

    skip_start: number|null;

    blade_master_attack_row: number;
}